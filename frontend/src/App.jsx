import { useState, useEffect } from 'react';
import './App.css';

const SESSION_TYPES = [
  { key: 'FirstPractice', label: 'Free Practice 1', hasResults: false },
  { key: 'SecondPractice', label: 'Free Practice 2', hasResults: false },
  { key: 'ThirdPractice', label: 'Free Practice 3', hasResults: false },
  { key: 'SprintQualifying', label: 'Sprint Qualifying', hasResults: false },
  { key: 'Sprint', label: 'Sprint', hasResults: true, endpoint: 'sprint' },
  { key: 'Qualifying', label: 'Qualifying', hasResults: true, endpoint: 'qualifying' },
];

const TEAM_COLORS = {
  mercedes: '#00D2BE',
  ferrari: '#DC0000',
  mclaren: '#FF8000',
  red_bull: '#3671C6',
  rb: '#6692FF',
  alpine: '#0090FF',
  haas: '#B6BABD',
  audi: '#BB0A30',
  williams: '#00A0DE',
  aston_martin: '#229971',
  cadillac: '#C6A664',
};

const COUNTRY_CODES = {
  Australia: 'au', China: 'cn', Japan: 'jp', USA: 'us', Italy: 'it',
  Monaco: 'mc', Spain: 'es', Canada: 'ca', Austria: 'at', UK: 'gb',
  Belgium: 'be', Hungary: 'hu', Netherlands: 'nl', Azerbaijan: 'az',
  Singapore: 'sg', Mexico: 'mx', Brazil: 'br', Qatar: 'qa',
  'UAE': 'ae', Bahrain: 'bh',
};

function getWeekendSessions(race) {
  return SESSION_TYPES
    .filter(s => race[s.key])
    .map(s => ({
      label: s.label,
      date: race[s.key].date,
      time: race[s.key].time,
      hasResults: s.hasResults,
      endpoint: s.endpoint,
    }))
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

function App() {
  const [nextRace, setNextRace] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [selectedResults, setSelectedResults] = useState(null);
  const [selectedRace, setSelectedRace] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [driverStandings, setDriverStandings] = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [standingsView, setStandingsView] = useState('drivers');

  async function viewResults(round, raceName) {
    const res = await fetch(`http://localhost:3001/api/results/${round}`);

    if (!res.ok) {
      setSelectedResults({ raceName, Results: [] });
      return;
    }

    const data = await res.json();
    setSelectedResults(data);
  }

  async function viewSessionResults(round, raceName, sessionLabel, endpoint) {
    if (!endpoint) {
      setSelectedResults({ raceName: sessionLabel, Results: [], notTracked: true });
      return;
    }

    const resultsKey = endpoint === 'qualifying' ? 'QualifyingResults' : 'SprintResults';
    const res = await fetch(`http://localhost:3001/api/${endpoint}/${round}`);

    if (!res.ok) {
      setSelectedResults({ raceName: sessionLabel, Results: [] });
      return;
    }

    const data = await res.json();
    setSelectedResults({ raceName: sessionLabel, Results: data[resultsKey] });
  }

  function handleRaceClick(race) {
    setSelectedRace(race);
    setSelectedResults(null);
  }

  useEffect(() => {
    async function loadNextRace() {
      const res = await fetch('http://localhost:3001/api/next-race');
      const data = await res.json();
      setNextRace(data);
    }

    async function loadSchedule() {
      const res = await fetch('http://localhost:3001/api/schedule');
      const data = await res.json();
      setSchedule(data);
    }

    async function loadDriverStandings() {
      const res = await fetch('http://localhost:3001/api/driver-standings');
      const data = await res.json();
      setDriverStandings(data);
    }

    async function loadConstructorStandings() {
      const res = await fetch('http://localhost:3001/api/constructor-standings');
      const data = await res.json();
      setConstructorStandings(data);
    }

    loadNextRace();
    loadSchedule();
    loadDriverStandings();
    loadConstructorStandings();
  }, []);

  useEffect(() => {
    if (!nextRace) return;

    const raceTime = new Date(`${nextRace.date}T${nextRace.time}`);

    function updateCountdown() {
      const now = new Date();
      const diff = raceTime - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, live: true });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextRace]);

  if (!nextRace) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <section className="panel">
        <h1>Next Race</h1>
        <div className="race-title-row">
          {COUNTRY_CODES[nextRace.Circuit.Location.country] && (
            <img
              src={`https://flagcdn.com/w80/${COUNTRY_CODES[nextRace.Circuit.Location.country]}.png`}
              alt={nextRace.Circuit.Location.country}
              className="flag"
            />
          )}
          <h2>{nextRace.raceName}</h2>
        </div>
        <p>{nextRace.Circuit.circuitName}, {nextRace.Circuit.Location.locality}, {nextRace.Circuit.Location.country}</p>
        <p>{nextRace.date} at {nextRace.time}</p>
        {countdown.live ? (
          <p className="countdown-live">Race weekend is live!</p>
        ) : (
          <div className="countdown-clock">
            <div className="countdown-unit">
              <span className="countdown-value">{String(countdown.days).padStart(2, '0')}</span>
              <span className="countdown-label">Days</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="countdown-label">Hrs</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="countdown-label">Min</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="countdown-label">Sec</span>
            </div>
          </div>
        )}
      </section>

      <div className="stripe"></div>

      {driverStandings.length >= 3 && (
        <section className="panel">
          <h1>Podium</h1>
          <div className="podium">
            <div className="podium-block p2">
              <span className="podium-pos">2</span>
              <span className="podium-name">{driverStandings[1].Driver.givenName} {driverStandings[1].Driver.familyName}</span>
              <span className="podium-pts">{driverStandings[1].points} pts</span>
            </div>
            <div className="podium-block p1">
              <span className="podium-pos">1</span>
              <span className="podium-name">{driverStandings[0].Driver.givenName} {driverStandings[0].Driver.familyName}</span>
              <span className="podium-pts">{driverStandings[0].points} pts</span>
            </div>
            <div className="podium-block p3">
              <span className="podium-pos">3</span>
              <span className="podium-name">{driverStandings[2].Driver.givenName} {driverStandings[2].Driver.familyName}</span>
              <span className="podium-pts">{driverStandings[2].points} pts</span>
            </div>
          </div>
        </section>
      )}

      <div className="stripe"></div>

      <section className="panel">
        <h1>Championship Standings</h1>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${standingsView === 'drivers' ? 'active' : ''}`}
            onClick={() => setStandingsView('drivers')}
          >
            Drivers
          </button>
          <button
            className={`toggle-btn ${standingsView === 'constructors' ? 'active' : ''}`}
            onClick={() => setStandingsView('constructors')}
          >
            Constructors
          </button>
        </div>

        <div className="standings-list">
          {standingsView === 'drivers'
            ? driverStandings.map(d => (
              <div
                key={d.Driver.driverId}
                className="standings-row"
                style={{ borderLeftColor: TEAM_COLORS[d.Constructors[0].constructorId] || 'var(--border)' }}
              >
                <span className="standings-pos">{d.position}</span>
                <span className="standings-name">{d.Driver.givenName} {d.Driver.familyName}</span>
                <span className="standings-pts">{d.points} pts</span>
                <span className="standings-wins">{d.wins}W</span>
              </div>
            ))
            : constructorStandings.map(c => (
              <div
                key={c.Constructor.constructorId}
                className="standings-row"
                style={{ borderLeftColor: TEAM_COLORS[c.Constructor.constructorId] || 'var(--border)' }}
              >
                <span className="standings-pos">{c.position}</span>
                <span className="standings-name">{c.Constructor.name}</span>
                <span className="standings-pts">{c.points} pts</span>
                <span className="standings-wins">{c.wins}W</span>
              </div>
            ))}
        </div>
      </section>

      <div className="stripe"></div>

      <section className="panel">
        <h1>Full Schedule</h1>
        <ul>
          {schedule.map(race => (
            <li
              key={race.round}
              style={{ fontWeight: race.round === nextRace.round ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => handleRaceClick(race)}
            >
              Round {race.round}: {race.raceName} — {race.date}
            </li>
          ))}
        </ul>
      </section>

      {selectedRace && (
        <>
          <div className="stripe"></div>
          <section className="panel">
            <h1>{selectedRace.raceName} Weekend</h1>
            <ul>
              {getWeekendSessions(selectedRace).map(session => (
                <li
                  key={session.label}
                  style={{ cursor: 'pointer' }}
                  onClick={() => viewSessionResults(selectedRace.round, selectedRace.raceName, session.label, session.endpoint)}
                >
                  {session.label} — {session.date} at {session.time}
                </li>
              ))}
              <li
                style={{ cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => viewResults(selectedRace.round, selectedRace.raceName)}
              >
                Race — {selectedRace.date} at {selectedRace.time}
              </li>
            </ul>
          </section>
        </>
      )}

      {selectedResults && (
        <>
          <div className="stripe"></div>
          <section className="panel">
            <h1>{selectedResults.raceName} Results</h1>
            {selectedResults.notTracked ? (
              <p>Results aren't tracked for this session.</p>
            ) : selectedResults.Results.length === 0 ? (
              <p>Results not available yet — check back after the session.</p>
            ) : (
              <ol>
                {selectedResults.Results.map(result => (
                  <li key={result.position}>
                    {result.Driver.givenName} {result.Driver.familyName} ({result.Constructor.name})
                    {result.Q1 !== undefined
                      ? ` — Q1: ${result.Q1 || '—'}, Q2: ${result.Q2 || '—'}, Q3: ${result.Q3 || '—'}`
                      : ` — ${result.Time?.time ?? result.status}`}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default App;