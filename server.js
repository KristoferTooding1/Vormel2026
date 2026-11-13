const express = require('express');
const cors = require('cors');
const path = require('path');
const { createAuth } = require('./auth');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const PORT = Number(process.env.PORT || 3001);
const JOLPICA_BASE = process.env.JOLPICA_BASE || 'https://api.jolpi.ca/ergast/f1';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'vormel.db');
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

async function fetchJolpica(endpoint) {
    const response = await fetch(`${JOLPICA_BASE}${endpoint}`);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Jolpica request failed (${response.status}): ${text.slice(0, 200)}`);
    }

    return response.json();
}

function createApp({ dbPath = DB_PATH } = {}) {
    const app = express();
    const auth = createAuth({ dbPath, secureCookies: COOKIE_SECURE });

    // Credentialed requests (the session cookie) require explicit origins, not "*".
    app.use(cors({ origin: CORS_ORIGINS, credentials: true }));

    app.use('/api/auth', auth.router);

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', uptime: process.uptime() });
    });

    app.get('/api/schedule', async (req, res) => {
        try {
            const data = await fetchJolpica('/2026.json');
            res.json(data.MRData.RaceTable.Races);
        } catch (error) {
            console.error('Schedule fetch failed:', error);
            res.status(502).json({ error: 'Unable to load the season schedule right now.' });
        }
    });

    app.get('/api/next-race', async (req, res) => {
        try {
            const data = await fetchJolpica('/2026.json');
            const races = data.MRData.RaceTable.Races;
            const now = new Date();
            const nextRace = races.find(race => new Date(`${race.date}T${race.time || '00:00:00Z'}`) >= now);

            if (!nextRace) {
                return res.status(404).json({ error: 'No upcoming races found — season may be over' });
            }

            res.json(nextRace);
        } catch (error) {
            console.error('Next race fetch failed:', error);
            res.status(502).json({ error: 'Unable to load the upcoming race right now.' });
        }
    });

    app.get('/api/results/:round', async (req, res) => {
        const { round } = req.params;

        try {
            const data = await fetchJolpica(`/2026/${round}/results.json`);
            const race = data.MRData.RaceTable.Races[0];

            if (!race) {
                return res.status(404).json({ error: 'No results found for that round yet' });
            }

            res.json(race);
        } catch (error) {
            console.error(`Results fetch failed for round ${round}:`, error);
            res.status(502).json({ error: 'Unable to load race results right now.' });
        }
    });

    app.get('/api/qualifying/:round', async (req, res) => {
        const { round } = req.params;

        try {
            const data = await fetchJolpica(`/2026/${round}/qualifying.json`);
            const race = data.MRData.RaceTable.Races[0];

            if (!race) {
                return res.status(404).json({ error: 'No qualifying results found yet' });
            }

            res.json(race);
        } catch (error) {
            console.error(`Qualifying fetch failed for round ${round}:`, error);
            res.status(502).json({ error: 'Unable to load qualifying results right now.' });
        }
    });

    app.get('/api/sprint/:round', async (req, res) => {
        const { round } = req.params;

        try {
            const data = await fetchJolpica(`/2026/${round}/sprint.json`);
            const race = data.MRData.RaceTable.Races[0];

            if (!race) {
                return res.status(404).json({ error: 'No sprint results found — this weekend may not have a sprint' });
            }

            res.json(race);
        } catch (error) {
            console.error(`Sprint fetch failed for round ${round}:`, error);
            res.status(502).json({ error: 'Unable to load sprint results right now.' });
        }
    });

    app.get('/api/driver-standings', async (req, res) => {
        try {
            const data = await fetchJolpica('/2026/driverStandings.json');
            const standings = data.MRData.StandingsTable.StandingsLists[0];

            if (!standings) {
                return res.status(404).json({ error: 'No standings available yet' });
            }

            res.json(standings.DriverStandings);
        } catch (error) {
            console.error('Driver standings fetch failed:', error);
            res.status(502).json({ error: 'Unable to load driver standings right now.' });
        }
    });

    app.get('/api/constructor-standings', async (req, res) => {
        try {
            const data = await fetchJolpica('/2026/constructorStandings.json');
            const standings = data.MRData.StandingsTable.StandingsLists[0];

            if (!standings) {
                return res.status(404).json({ error: 'No standings available yet' });
            }

            res.json(standings.ConstructorStandings);
        } catch (error) {
            console.error('Constructor standings fetch failed:', error);
            res.status(502).json({ error: 'Unable to load constructor standings right now.' });
        }
    });

    app.use((err, req, res, next) => {
        // Malformed or oversized request bodies are the client's fault, not a server error.
        if (err.status >= 400 && err.status < 500) {
            return res.status(err.status).json({ error: 'Invalid request.' });
        }

        console.error('Unhandled server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
}

if (require.main === module) {
    const app = createApp();
    app.listen(PORT, () => {
        console.log(`API running on http://localhost:${PORT}`);
    });
}

module.exports = { createApp, fetchJolpica };