import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AptitudeRealm({ teamState, socket }) {
  const navigate = useNavigate();
  
  const aptScores = teamState?.scores?.aptitude || {};
  const isTask1Done = aptScores.task1?.completed;
  const isTask2Done = aptScores.task2?.completed;
  const isTask3Done = aptScores.task3?.completed;

  const techScores = teamState?.scores?.tech || {};
  const isTechDone = techScores.task3?.completed;

  const [currentTask, setCurrentTask] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isTask1Done && !isTask2Done) setCurrentTask(2);
    if (isTask2Done && !isTask3Done) setCurrentTask(3);
    if (isTask3Done) setCurrentTask(4);
  }, [isTask1Done, isTask2Done, isTask3Done]);

  useEffect(() => {
    socket.on('task_success', ({ taskKey }) => {
      setErrorMsg('');
      if (taskKey === 'task1') setCurrentTask(2);
      if (taskKey === 'task2') setCurrentTask(3);
      if (taskKey === 'task3') setCurrentTask(4);
    });

    socket.on('task_failed', ({ message }) => {
      setErrorMsg(message);
    });

    return () => {
      socket.off('task_success');
      socket.off('task_failed');
    };
  }, [socket]);

  // Task 1: Water Jug
  const [jugActions, setJugActions] = useState([]);
  const [j5, setJ5] = useState(0);
  const [j3, setJ3] = useState(0);

  const handleJug = (action) => {
    setJugActions([...jugActions, action]);
    if (action === 'fill5') setJ5(5);
    if (action === 'fill3') setJ3(3);
    if (action === 'empty5') setJ5(0);
    if (action === 'empty3') setJ3(0);
    if (action === 'pour5to3') {
      let transfer = Math.min(j5, 3 - j3);
      setJ5(j5 - transfer);
      setJ3(j3 + transfer);
    }
    if (action === 'pour3to5') {
      let transfer = Math.min(j3, 5 - j5);
      setJ3(j3 - transfer);
      setJ5(j5 + transfer);
    }
  };

  const submitWaterJug = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, 
      realm: 'aptitude', 
      taskKey: 'task1', 
      payload: { data: jugActions, movesCount: jugActions.length } 
    });
  };

  const resetJug = () => {
    setJugActions([]); setJ5(0); setJ3(0);
  };

  // Task 2: Fuses
  const [fuseActions, setFuseActions] = useState([]);
  const [fuseClicks, setFuseClicks] = useState(0);
  
  const submitFuses = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, 
      realm: 'aptitude', 
      taskKey: 'task2', 
      payload: { data: fuseActions, movesCount: fuseClicks } 
    });
  };

  // Task 3: Knapsack
  const crewOptions = [
    { id: 'Eng', w: 40, v: 50 },
    { id: 'Med', w: 30, v: 40 },
    { id: 'Sec', w: 50, v: 60 },
    { id: 'Sci', w: 20, v: 30 },
    { id: 'Ops', w: 10, v: 20 }
  ];
  const [selectedCrew, setSelectedCrew] = useState([]);
  const [crewClicks, setCrewClicks] = useState(0);

  const handleCrewClick = (id) => {
    setCrewClicks(prev => prev + 1);
    if (selectedCrew.includes(id)) {
      setSelectedCrew(selectedCrew.filter(x => x !== id));
    } else {
      setSelectedCrew([...selectedCrew, id]);
    }
  };

  const currentWeight = selectedCrew.reduce((acc, id) => acc + crewOptions.find(c => c.id === id).w, 0);

  const submitKnapsack = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, 
      realm: 'aptitude', 
      taskKey: 'task3', 
      payload: { data: selectedCrew, movesCount: crewClicks } 
    });
  };

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (teamState?.startTime && !teamState?.endTime) {
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(teamState.startTime)) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    } else if (teamState?.endTime) {
      setElapsed(Math.floor((new Date(teamState.endTime) - new Date(teamState.startTime)) / 1000));
    }
  }, [teamState]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  if (!teamState) return <div>Loading...</div>;

  return (
    <div className="wood-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Aptitude Realm</h2>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--gold-accent)' }}>
          ⏱ {formatTime(elapsed)}
        </div>
      </div>
      {errorMsg && <div style={{ color: 'var(--danger)', marginBottom: '15px', fontWeight: 'bold' }}>{errorMsg}</div>}

      <div style={{ marginTop: '20px' }}>
        {currentTask === 1 && !isTask1Done && (
          <div>
            <h3>Task 1: Preventing Core Meltdown</h3>
            <p>Isolate exactly 4L of heavy water in the 5L container using only a 5L and 3L unmarked container and an infinite tap.</p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '20px 0', alignItems: 'flex-end', height: '150px' }}>
              <div style={{ width: '80px', height: '120px', border: '3px solid var(--text-main)', borderTop: 'none', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j5/5)*100}%`, background: 'var(--danger)', transition: 'height 0.3s' }}></div>
                <div style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>5L</div>
              </div>
              <div style={{ width: '60px', height: '72px', border: '3px solid var(--text-main)', borderTop: 'none', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j3/3)*100}%`, background: 'var(--danger)', transition: 'height 0.3s' }}></div>
                <div style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>3L</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '40px', marginBottom: '20px' }}>
              <button className="btn-primary" onClick={() => handleJug('fill5')}>Fill 5L</button>
              <button className="btn-primary" onClick={() => handleJug('fill3')}>Fill 3L</button>
              <button className="btn-primary" onClick={() => handleJug('pour5to3')}>Pour 5L to 3L</button>
              <button className="btn-primary" onClick={() => handleJug('pour3to5')}>Pour 3L to 5L</button>
              <button className="btn-primary" onClick={() => handleJug('empty5')}>Empty 5L</button>
              <button className="btn-primary" onClick={() => handleJug('empty3')}>Empty 3L</button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={resetJug} style={{ flex: 1, background: 'transparent', color: 'var(--gold-accent)' }}>Reset</button>
              <button className="btn-primary" onClick={submitWaterJug} style={{ flex: 2 }}>Submit Logic</button>
            </div>
          </div>
        )}

        {currentTask === 2 && !isTask2Done && (
          <div>
            <h3>Task 2: Restoring Communications</h3>
            <p>Use two uneven 60-minute fuses (A and B) to measure exactly 45 minutes.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              {['light_a_both', 'light_b_one', 'wait_a', 'light_b_other', 'wait_b'].map(action => (
                <button 
                  key={action}
                  className="btn-primary" 
                  style={{ background: fuseActions.includes(action) ? 'var(--gold-accent)' : '', color: fuseActions.includes(action) ? '#000' : '' }}
                  onClick={() => {
                    setFuseClicks(prev => prev + 1);
                    if(fuseActions.includes(action)) setFuseActions(fuseActions.filter(a => a !== action));
                    else setFuseActions([...fuseActions, action]);
                  }}>
                  {action.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
            <p>Selected Sequence: {fuseActions.join(' ➔ ')}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={() => setFuseActions([])} style={{ flex: 1, background: 'transparent', color: 'var(--gold-accent)' }}>Clear</button>
              <button className="btn-primary" onClick={submitFuses} style={{ flex: 2 }}>Submit Sequence</button>
            </div>
          </div>
        )}

        {currentTask === 3 && !isTask3Done && (
          <div>
            <h3>Task 3: The Evacuation Directive</h3>
            <p>Select the optimal rescue group. Max Capacity: 100.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              {crewOptions.map(crew => (
                <div 
                  key={crew.id} 
                  onClick={() => handleCrewClick(crew.id)}
                  style={{ 
                    padding: '15px', border: '1px solid var(--gold-accent)', borderRadius: '4px', cursor: 'pointer',
                    background: selectedCrew.includes(crew.id) ? 'var(--gold-accent)' : 'transparent',
                    color: selectedCrew.includes(crew.id) ? '#000' : 'var(--text-main)',
                    display: 'flex', justifyContent: 'space-between'
                  }}>
                  <span>{crew.id}</span>
                  <span>Weight: {crew.w} | Value: {crew.v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold', color: currentWeight > 100 ? 'var(--danger)' : 'var(--success)' }}>
              <span>Total Weight: {currentWeight} / 100</span>
            </div>
            <button className="btn-primary" onClick={submitKnapsack} style={{ width: '100%' }}>Finalize Manifest</button>
          </div>
        )}

        {currentTask === 4 && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <h3 style={{ color: 'var(--success)' }}>Aptitude Realm Secure!</h3>
            {!isTechDone ? (
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                <p>Waiting for Player 1 to secure the Tech Realm...</p>
                <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid var(--gold-accent)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => navigate('/fusion')} style={{ width: '100%', marginTop: '20px', padding: '20px', fontSize: '1.2rem' }}>
                INITIATE JIGSAW FUSION
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AptitudeRealm;
