import { useState, useEffect } from 'react';

function App() {
  const [nextRace, setNextRace] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [selectedResults, setSelectedResults] = useState(null);

  function viewResults(round) {
    fetch(`http://localhost:3001/api/results/${round}`)
      .then(res => res.json())
      .then(data => setSelectedResults(data));
  }

  useEffect(() => {
    fetch('http://localhost:3001/api/next-race')
      .then(res => res.json())
      .then(data => setNextRace(data));

    fetch('http://localhost:3001/api/schedule')
      .then(res => res.json())
      .then(data => setSchedule(data));
  }, []);

  if (!nextRace) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Next Race</h1>
      <h2>{nextRace.raceName}</h2>
      <p>{nextRace.Circuit.circuitName}, {nextRace.Circuit.Location.locality}, {nextRace.Circuit.Location.country}</p>
      <p>{nextRace.date} at {nextRace.time}</p>

      <h1>Full Schedule</h1>
      <ul>
        {schedule.map(race => (
          <li
            key={race.round}
            style={{ fontWeight: race.round === nextRace.round ? 'bold' : 'normal', cursor: 'pointer' }}
            onClick={() => viewResults(race.round)}
          >
            Round {race.round}: {race.raceName} — {race.date}
          </li>
        ))}
      </ul>

      {selectedResults && (
        <div>
          <h1>{selectedResults.raceName} Results</h1>
          <ol>
            {selectedResults.Results.map(result => (
              <li key={result.position}>
                {result.Driver.givenName} {result.Driver.familyName} ({result.Constructor.name}) — {result.Time?.time ?? result.status}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;