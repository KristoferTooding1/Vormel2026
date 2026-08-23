const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';

app.get('/api/schedule', async (req, res) => {
    const response = await fetch(`${JOLPICA_BASE}/2026.json`);
    const data = await response.json();
    res.json(data.MRData.RaceTable.Races);
});

app.get('/api/next-race', async (req, res) => {
    const response = await fetch(`${JOLPICA_BASE}/2026.json`);
    const data = await response.json();
    const races = data.MRData.RaceTable.Races;

    const now = new Date();
    const nextRace = races.find(race => new Date(`${race.date}T${race.time || '00:00:00Z'}`) >= now);

    if (!nextRace) {
        return res.status(404).json({ error: 'No upcoming races found — season may be over' });
    }

    res.json(nextRace);
});

app.get('/api/results/:round', async (req, res) => {
    const { round } = req.params;
    const response = await fetch(`${JOLPICA_BASE}/2026/${round}/results.json`);
    const data = await response.json();
    const race = data.MRData.RaceTable.Races[0];

    if (!race) {
        return res.status(404).json({ error: 'No results found for that round yet' });
    }

    res.json(race);
});

app.get('/api/qualifying/:round', async (req, res) => {
    const { round } = req.params;
    const response = await fetch(`${JOLPICA_BASE}/2026/${round}/qualifying.json`);
    const data = await response.json();
    const race = data.MRData.RaceTable.Races[0];

    if (!race) {
        return res.status(404).json({ error: 'No qualifying results found yet' });
    }

    res.json(race);
});

app.get('/api/sprint/:round', async (req, res) => {
    const { round } = req.params;
    const response = await fetch(`${JOLPICA_BASE}/2026/${round}/sprint.json`);
    const data = await response.json();
    const race = data.MRData.RaceTable.Races[0];

    if (!race) {
        return res.status(404).json({ error: 'No sprint results found — this weekend may not have a sprint' });
    }

    res.json(race);
});

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});