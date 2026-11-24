const test = require('node:test');
const assert = require('node:assert');

const { createApp, createJolpicaClient } = require('./server');

test('createApp returns an Express app instance', () => {
  const app = createApp({ dbPath: ':memory:' });
  assert.ok(app);
  assert.strictEqual(typeof app.get, 'function');
});

async function startServer(t) {
  const server = createApp({ dbPath: ':memory:' }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());

  const base = `http://localhost:${server.address().port}/api/auth`;

  return async function request(method, path, { body, cookie } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const setCookie = response.headers.getSetCookie()[0];

    return {
      status: response.status,
      data: await response.json(),
      setCookie,
      cookie: setCookie ? setCookie.split(';')[0] : undefined,
    };
  };
}

test('register, session lookup, logout and login round trip', async (t) => {
  const request = await startServer(t);
  const credentials = { username: 'max_fan', password: 'supersecret1' };

  const registered = await request('POST', '/register', { body: credentials });
  assert.strictEqual(registered.status, 201);
  assert.strictEqual(registered.data.user.username, 'max_fan');
  assert.match(registered.setCookie, /HttpOnly/);
  assert.match(registered.setCookie, /SameSite=Lax/);

  const me = await request('GET', '/me', { cookie: registered.cookie });
  assert.strictEqual(me.data.user.username, 'max_fan');

  const loggedOut = await request('POST', '/logout', { cookie: registered.cookie });
  assert.strictEqual(loggedOut.status, 200);

  const afterLogout = await request('GET', '/me', { cookie: registered.cookie });
  assert.strictEqual(afterLogout.data.user, null);

  const loggedIn = await request('POST', '/login', { body: credentials });
  assert.strictEqual(loggedIn.status, 200);

  const meAgain = await request('GET', '/me', { cookie: loggedIn.cookie });
  assert.strictEqual(meAgain.data.user.username, 'max_fan');
});

test('me returns no user without a session', async (t) => {
  const request = await startServer(t);

  const me = await request('GET', '/me');
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.data.user, null);

  const forged = await request('GET', '/me', { cookie: 'vormel_session=not-a-real-token' });
  assert.strictEqual(forged.data.user, null);
});

test('register rejects invalid input and duplicate usernames', async (t) => {
  const request = await startServer(t);

  const badUsername = await request('POST', '/register', { body: { username: 'a', password: 'supersecret1' } });
  assert.strictEqual(badUsername.status, 400);

  const shortPassword = await request('POST', '/register', { body: { username: 'lando', password: 'short' } });
  assert.strictEqual(shortPassword.status, 400);

  const first = await request('POST', '/register', { body: { username: 'lando', password: 'supersecret1' } });
  assert.strictEqual(first.status, 201);

  const duplicate = await request('POST', '/register', { body: { username: 'LANDO', password: 'supersecret1' } });
  assert.strictEqual(duplicate.status, 409);
});

test('login rejects wrong credentials and locks out after repeated failures', async (t) => {
  const request = await startServer(t);
  await request('POST', '/register', { body: { username: 'charles', password: 'supersecret1' } });

  const wrongPassword = await request('POST', '/login', { body: { username: 'charles', password: 'wrongpassword' } });
  assert.strictEqual(wrongPassword.status, 401);
  assert.strictEqual(wrongPassword.setCookie, undefined);

  const unknownUser = await request('POST', '/login', { body: { username: 'nobody', password: 'supersecret1' } });
  assert.strictEqual(unknownUser.status, 401);
  assert.strictEqual(unknownUser.data.error, wrongPassword.data.error);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await request('POST', '/login', { body: { username: 'charles', password: 'wrongpassword' } });
  }

  const lockedOut = await request('POST', '/login', { body: { username: 'charles', password: 'supersecret1' } });
  assert.strictEqual(lockedOut.status, 429);
});

function fakeUpstream() {
  const calls = [];
  let failNext = false;

  async function fetchImpl(url) {
    calls.push(url);
    if (failNext) {
      return { ok: false, status: 503, text: async () => 'down' };
    }
    return { ok: true, json: async () => ({ url, n: calls.length }) };
  }

  return { calls, fetchImpl, fail: () => { failNext = true; } };
}

test('jolpica client caches responses until the TTL expires', async () => {
  const upstream = fakeUpstream();
  let clock = 0;
  const jolpica = createJolpicaClient({ baseUrl: 'http://x', fetchImpl: upstream.fetchImpl, ttlMs: 1000, now: () => clock });

  const first = await jolpica('/2026.json');
  const second = await jolpica('/2026.json');
  assert.strictEqual(upstream.calls.length, 1);
  assert.deepStrictEqual(second, first);

  clock = 1001;
  const refreshed = await jolpica('/2026.json');
  assert.strictEqual(upstream.calls.length, 2);
  assert.strictEqual(refreshed.n, 2);
});

test('jolpica client shares one upstream call between concurrent requests', async () => {
  const upstream = fakeUpstream();
  const jolpica = createJolpicaClient({ baseUrl: 'http://x', fetchImpl: upstream.fetchImpl });

  await Promise.all([jolpica('/a.json'), jolpica('/a.json'), jolpica('/a.json')]);
  assert.strictEqual(upstream.calls.length, 1);
});

test('jolpica client serves stale data when upstream fails, and errors with no cache', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const upstream = fakeUpstream();
  let clock = 0;
  const jolpica = createJolpicaClient({ baseUrl: 'http://x', fetchImpl: upstream.fetchImpl, ttlMs: 1000, now: () => clock });

  const cached = await jolpica('/2026.json');
  clock = 5000;
  upstream.fail();

  assert.deepStrictEqual(await jolpica('/2026.json'), cached);
  await assert.rejects(jolpica('/other.json'), /503/);
});

test('jolpica client evicts the oldest entry beyond maxEntries', async () => {
  const upstream = fakeUpstream();
  const jolpica = createJolpicaClient({ baseUrl: 'http://x', fetchImpl: upstream.fetchImpl, maxEntries: 2 });

  await jolpica('/1.json');
  await jolpica('/2.json');
  await jolpica('/3.json');
  await jolpica('/1.json');
  assert.strictEqual(upstream.calls.length, 4);
});

test('race endpoints use the injected client and reject invalid rounds', async (t) => {
  const requested = [];
  const jolpica = async (endpoint) => {
    requested.push(endpoint);
    return { MRData: { RaceTable: { Races: [{ round: '3' }] } } };
  };
  const server = createApp({ dbPath: ':memory:', jolpica }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}/api`;

  const ok = await fetch(`${base}/results/3`);
  assert.strictEqual(ok.status, 200);
  assert.deepStrictEqual(requested, ['/2026/3/results.json']);

  for (const bad of ['0', 'abc', '100', '..%2F..%2Fdrivers']) {
    const res = await fetch(`${base}/results/${bad}`);
    assert.strictEqual(res.status, 400, `round ${bad}`);
  }
  assert.strictEqual(requested.length, 1);
});

test('favourite team can be set, read back, cleared, and needs a session', async (t) => {
  const request = await startServer(t);

  const anonymous = await request('POST', '/favorite-team', { body: { constructorId: 'ferrari' } });
  assert.strictEqual(anonymous.status, 401);

  const registered = await request('POST', '/register', { body: { username: 'tifosi', password: 'supersecret1' } });
  assert.strictEqual(registered.data.user.favoriteTeam, null);
  const { cookie } = registered;

  const set = await request('POST', '/favorite-team', { body: { constructorId: 'ferrari' }, cookie });
  assert.strictEqual(set.status, 200);
  assert.strictEqual(set.data.user.favoriteTeam, 'ferrari');

  const me = await request('GET', '/me', { cookie });
  assert.strictEqual(me.data.user.favoriteTeam, 'ferrari');

  const login = await request('POST', '/login', { body: { username: 'tifosi', password: 'supersecret1' } });
  assert.strictEqual(login.data.user.favoriteTeam, 'ferrari');

  for (const bad of ['Ferrari', '', 'x'.repeat(41), 42, '../etc', undefined]) {
    const res = await request('POST', '/favorite-team', { body: { constructorId: bad }, cookie });
    assert.strictEqual(res.status, 400, `constructorId ${JSON.stringify(bad)}`);
  }

  const cleared = await request('POST', '/favorite-team', { body: { constructorId: null }, cookie });
  assert.strictEqual(cleared.data.user.favoriteTeam, null);
  assert.strictEqual((await request('GET', '/me', { cookie })).data.user.favoriteTeam, null);
});

test('existing databases without the favourite team column are upgraded', async (t) => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { DatabaseSync } = require('node:sqlite');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vormel-'));
  const dbPath = path.join(dir, 'old.db');
  const old = new DatabaseSync(dbPath);
  old.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  old.close();

  createApp({ dbPath, jolpica: async () => ({}) });
  const upgraded = new DatabaseSync(dbPath);
  const columns = upgraded.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  upgraded.close();
  assert.ok(columns.includes('favorite_team'));
  t.after(() => {
    // Windows can't delete the file while the app still holds the database open.
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  });
});
