# Vormel2026 🏁

A full-stack Formula 1 companion site for the 2026 season — live countdown to the next race, the full calendar, weekend session schedules, qualifying/race/sprint results, and championship standings, all pulled from a real external F1 data API.

## Overview

Vormel2026 was built from the ground up as a two-part application: an Express backend that consumes the [Jolpica-F1 API](https://github.com/jolpica/jolpica-f1) (the actively maintained, Ergast-compatible successor to the now-retired Ergast API) and reshapes it into clean endpoints, and a React frontend that renders it all in a custom-designed dark UI inspired by F1's own live timing broadcasts.

## Features

- **Live countdown** to the next race weekend, updating every second
- **Full season schedule** with country flags and next-race highlighting
- **Weekend session breakdown** per race — practice, qualifying, sprint (where applicable), correctly detected per weekend format
- **Session results** — race, qualifying (Q1/Q2/Q3), and sprint results, with honest "not tracked" messaging for sessions the API doesn't cover (practice, sprint qualifying)
- **Championship podium** — current top 3 drivers, styled as a real podium
- **Full standings** — drivers and constructors, with team-colored rows
- **User accounts** — register, log in and log out; the site itself stays public

## Tech stack

**Backend**
- Node.js + Express
- Consumes the [Jolpica-F1 API](https://api.jolpi.ca/ergast/f1) (no auth required)
- User accounts stored in SQLite via Node's built-in `node:sqlite` (requires Node 24+), passwords hashed with scrypt, sessions kept in an HttpOnly cookie

**Frontend**
- React 18 (Vite)
- Plain CSS with custom design tokens — no UI framework

**Infrastructure**
- Docker (multi-stage build for the frontend: Vite build → served via nginx)
- Docker Compose to orchestrate both services together

## Design

The UI follows a custom "Carbon & Livery" direction — a dark, motorsport-inspired system built around:
- A graphite/steel color palette with a racing-red accent
- Condensed, uppercase headings (Barlow Condensed) paired with monospace timing data (JetBrains Mono) for anything tabular
- An angled "livery stripe" motif used as the visual divider between sections
- Team colors applied functionally throughout standings, not just decoratively

## Running locally

**With Docker (recommended):**
```bash
docker compose up --build
```
Frontend: `http://localhost:8080` · Backend: `http://localhost:3001`

**Without Docker:**
```bash
# Backend
npm install
node server.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/schedule` | Full season schedule |
| `GET /api/next-race` | Next upcoming race, calculated from current date |
| `GET /api/results/:round` | Race results for a given round |
| `GET /api/qualifying/:round` | Qualifying results (Q1/Q2/Q3) |
| `GET /api/sprint/:round` | Sprint results (sprint weekends only) |
| `GET /api/driver-standings` | Current driver championship standings |
| `GET /api/constructor-standings` | Current constructor championship standings |
| `POST /api/auth/register` | Create an account (`{ username, password }`) and log in |
| `POST /api/auth/login` | Log in (`{ username, password }`), sets the session cookie |
| `POST /api/auth/logout` | End the current session |
| `GET /api/auth/me` | The logged-in user, or `{ "user": null }` |

## Configuration

Copy `.env.example` to `.env` to override the defaults.

| Variable | Default | Purpose |
|---|---|---|
| `DB_PATH` | `./data/vormel.db` | SQLite file for accounts and sessions |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:8080` | Frontend origins allowed to send the login cookie |
| `COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS |

## Known limitations

- Practice session and sprint qualifying results aren't available — Jolpica (like its Ergast predecessor) only tracks classifications for race, qualifying, and sprint sessions.
- Jolpica responses are cached in memory for 5 minutes (`CACHE_TTL_SECONDS`), so results can lag the official timing by that much. The cache is per process and resets on restart.

## Data source

All F1 data via the [Jolpica-F1 API](https://github.com/jolpica/jolpica-f1), an open, community-maintained project. This site is unofficial and not affiliated with Formula 1, FIA, or Jolpica.

## License

MIT — see [LICENSE](./LICENSE).