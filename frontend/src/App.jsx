import { useState, useEffect } from 'react';

const SESSION_TYPES = [
  { key: 'FirstPractice', label: 'Free Practice 1', hasResults: false },
  { key: 'SecondPractice', label: 'Free Practice 2', hasResults: false },
  { key: 'ThirdPractice', label: 'Free Practice 3', hasResults: false },
  { key: 'SprintQualifying', label: 'Sprint Qualifying', hasResults: false },
  { key: 'Sprint', label: 'Sprint', hasResults: true, endpoint: 'sprint' },
  { key: 'Qualifying', label: 'Qualifying', hasResults: true, endpoint: 'qualifying' },
];

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
  const [countdown, setCountdown] = useState('');

  function viewResults(round, raceName) {
    fetch(`http://localhost:3001/api/results/${round}`)
      .then(res => {
        if (!res.ok) {
          setSelectedResults({ raceName, Results: [] });
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setSelectedResults(data);
      });
  }

  function viewSessionResults(round, raceName, sessionLabel, endpoint) {
    if (!endpoint) {
      setSelectedResults({ raceName: sessionLabel, Results: [], notTracked: true });
      return;
    }

    const resultsKey = endpoint === 'qualifying' ? 'QualifyingResults' : 'SprintResults';

    fetch(`http://localhost:3001/api/${endpoint}/${round}`)
      .then(res => {
        if (!res.ok) {
          setSelectedResults({ raceName: sessionLabel, Results: [] });
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setSelectedResults({ raceName: sessionLabel, Results: data[resultsKey] });
      });
  }

  function handleRaceClick(race) {
    setSelectedRace(race);
    setSelectedResults(null);
  }

  useEffect(() => {
    fetch('http://localhost:3001/api/next-race')
      .then(res => res.json())
      .then(data => setNextRace(data));

    fetch('http://localhost:3001/api/schedule')
      .then(res => res.json())
      .then(data => {
        console.log(data.filter(r => r.Sprint));
        setSchedule(data);
      });
  }, []);

  useEffect(() => {
    if (!nextRace) return;

    const raceTime = new Date(`${nextRace.date}T${nextRace.time}`);

    function updateCountdown() {
      const now = new Date();
      const diff = raceTime - now;

      if (diff <= 0) {
        setCountdown('Race weekend is live!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
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
      <h1>Next Race</h1>
      <h2>{nextRace.raceName}</h2>
      <p>{nextRace.Circuit.circuitName}, {nextRace.Circuit.Location.locality}, {nextRace.Circuit.Location.country}</p>
      <p>{nextRace.date} at {nextRace.time}</p>
      <p>{countdown}</p>
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

      {selectedRace && (
        <div>
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
        </div>
      )}

      {selectedResults && (
        <div>
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
        </div>
      )}
    </div>
  );
}

export default App;