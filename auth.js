const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const scrypt = promisify(crypto.scrypt);

const SESSION_COOKIE = 'vormel_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const CONSTRUCTOR_ID_PATTERN = /^[a-z0-9_]{1,40}$/;

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password, stored) {
    const [scheme, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(actual, expected);
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function readCookie(req, name) {
    const header = req.headers.cookie;
    if (!header) return null;

    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator !== -1 && part.slice(0, separator).trim() === name) {
            return part.slice(separator + 1).trim();
        }
    }

    return null;
}

function openDatabase(dbPath) {
    if (dbPath !== ':memory:') {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    const db = new DatabaseSync(dbPath);
    db.exec(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
    `);

    // Databases created before favourite teams existed need the column added.
    const columns = db.prepare('PRAGMA table_info(users)').all().map(column => column.name);
    if (!columns.includes('favorite_team')) {
        db.exec('ALTER TABLE users ADD COLUMN favorite_team TEXT');
    }

    return db;
}

function toPublicUser(row) {
    return { id: row.id, username: row.username, favoriteTeam: row.favorite_team ?? null };
}

function createAuth({ dbPath, secureCookies = false }) {
    const db = openDatabase(dbPath);
    const router = express.Router();
    const failedLogins = new Map();

    // Hashed against when the username doesn't exist, so a missing account
    // takes as long to reject as a wrong password.
    const dummyHash = hashPassword(crypto.randomBytes(16).toString('hex'));

    const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
    };

    function isLockedOut(ip) {
        const entry = failedLogins.get(ip);
        if (!entry) return false;

        if (entry.resetAt <= Date.now()) {
            failedLogins.delete(ip);
            return false;
        }

        return entry.count >= MAX_FAILED_LOGINS;
    }

    function recordFailedLogin(ip) {
        const entry = failedLogins.get(ip);

        if (!entry || entry.resetAt <= Date.now()) {
            failedLogins.set(ip, { count: 1, resetAt: Date.now() + FAILED_LOGIN_WINDOW_MS });
        } else {
            entry.count += 1;
        }
    }

    function startSession(res, userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const now = Date.now();

        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
        db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
            .run(hashToken(token), userId, now + SESSION_TTL_MS);

        res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_MS });
    }

    function getSessionUser(req) {
        const token = readCookie(req, SESSION_COOKIE);
        if (!token) return null;

        const user = db.prepare(`
            SELECT users.id, users.username, users.favorite_team
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
        `).get(hashToken(token), Date.now());

        return user ? toPublicUser(user) : null;
    }

    function readCredentials(req) {
        const { username, password } = req.body || {};
        return {
            username: typeof username === 'string' ? username.trim() : '',
            password: typeof password === 'string' ? password : '',
        };
    }

    router.use(express.json({ limit: '10kb' }));

    router.post('/register', async (req, res) => {
        const { username, password } = readCredentials(req);

        if (!USERNAME_PATTERN.test(username)) {
            return res.status(400).json({ error: 'Username must be 3–20 characters: letters, numbers or underscores.' });
        }

        if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({ error: `Password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.` });
        }

        const passwordHash = await hashPassword(password);
        let userId;

        try {
            const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
                .run(username, passwordHash);
            userId = Number(result.lastInsertRowid);
        } catch (error) {
            if (String(error.message).includes('UNIQUE')) {
                return res.status(409).json({ error: 'That username is already taken.' });
            }
            throw error;
        }

        startSession(res, userId);
        res.status(201).json({ user: { id: userId, username, favoriteTeam: null } });
    });

    router.post('/login', async (req, res) => {
        if (isLockedOut(req.ip)) {
            return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' });
        }

        const { username, password } = readCredentials(req);
        const user = db.prepare('SELECT id, username, password_hash, favorite_team FROM users WHERE username = ?').get(username);

        const passwordOk = password.length <= MAX_PASSWORD_LENGTH
            && await verifyPassword(password, user ? user.password_hash : await dummyHash);

        if (!user || !passwordOk) {
            recordFailedLogin(req.ip);
            return res.status(401).json({ error: 'Incorrect username or password.' });
        }

        startSession(res, user.id);
        res.json({ user: toPublicUser(user) });
    });

    router.post('/logout', (req, res) => {
        const token = readCookie(req, SESSION_COOKIE);

        if (token) {
            db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
        }

        res.clearCookie(SESSION_COOKIE, cookieOptions);
        res.json({ user: null });
    });

    router.get('/me', (req, res) => {
        res.json({ user: getSessionUser(req) });
    });

    // Body: { constructorId: "ferrari" } to set, or { constructorId: null } to clear.
    router.post('/favorite-team', (req, res) => {
        const user = getSessionUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Log in to pick a favourite team.' });
        }

        const { constructorId } = req.body || {};
        if (constructorId !== null && !(typeof constructorId === 'string' && CONSTRUCTOR_ID_PATTERN.test(constructorId))) {
            return res.status(400).json({ error: 'Invalid team.' });
        }

        db.prepare('UPDATE users SET favorite_team = ? WHERE id = ?').run(constructorId, user.id);
        res.json({ user: { ...user, favoriteTeam: constructorId } });
    });

    return { router, getSessionUser };
}

module.exports = { createAuth };
