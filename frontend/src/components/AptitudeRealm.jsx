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
  const [j7, setJ7] = useState(0);
  const [j4, setJ4] = useState(0);

  const handleJug = (action) => {
    setJugActions([...jugActions, action]);
    if (action === 'fill7') setJ7(7);
    if (action === 'fill4') setJ4(4);
    if (action === 'empty7') setJ7(0);
    if (action === 'empty4') setJ4(0);
    if (action === 'pour7to4') {
      let transfer = Math.min(j7, 4 - j4);
      setJ7(j7 - transfer);
      setJ4(j4 + transfer);
    }
    if (action === 'pour4to7') {
      let transfer = Math.min(j4, 7 - j7);
      setJ4(j4 - transfer);
      setJ7(j7 + transfer);
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
    setJugActions([]); setJ7(0); setJ4(0);
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
    { id: 'Commander', w: 25, v: 50 },
    { id: 'Engineer', w: 40, v: 45 },
    { id: 'Medic', w: 20, v: 40 },
    { id: 'Security', w: 50, v: 60 },
    { id: 'Scientist', w: 30, v: 35 },
    { id: 'Operations', w: 15, v: 25 },
    { id: 'Comms', w: 10, v: 15 },
    { id: 'Pilot', w: 35, v: 55 },
    { id: 'Navigator', w: 20, v: 30 },
    { id: 'Gunner', w: 45, v: 50 }
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

  useEffect(() => {
    if (!teamState && !localStorage.getItem('teamCode')) {
      navigate('/');
    }
  }, [teamState, navigate]);

  if (!teamState) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h3>Loading game data...</h3>
        <p style={{ opacity: 0.7 }}>(This may take up to a minute if the server is waking up)</p>
      </div>
    );
  }

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
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px', fontStyle: 'italic', lineHeight: '1.6' }}>
              <p>You wake up to sirens screaming. The facility's backup cooling generator is dangerously overheating and will explode within minutes. The automatic systems are dead, requiring you to perform an immediate emergency fluid dump.</p>
            </div>
            <p>Isolate exactly 5L of heavy water in the 7L container using only a 7L and 4L unmarked container and an infinite tap.</p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '20px 0', alignItems: 'flex-end', height: '150px' }}>
              <div style={{ width: '80px', height: '120px', border: '3px solid var(--text-main)', borderTop: 'none', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j7/7)*100}%`, background: 'var(--danger)', transition: 'height 0.3s' }}></div>
                <div style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>7L</div>
              </div>
              <div style={{ width: '60px', height: '72px', border: '3px solid var(--text-main)', borderTop: 'none', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j4/4)*100}%`, background: 'var(--danger)', transition: 'height 0.3s' }}></div>
                <div style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>4L</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '40px', marginBottom: '20px' }}>
              <button className="btn-primary" onClick={() => handleJug('fill7')}>Fill 7L</button>
              <button className="btn-primary" onClick={() => handleJug('fill4')}>Fill 4L</button>
              <button className="btn-primary" onClick={() => handleJug('pour7to4')}>Pour 7L to 4L</button>
              <button className="btn-primary" onClick={() => handleJug('pour4to7')}>Pour 4L to 7L</button>
              <button className="btn-primary" onClick={() => handleJug('empty7')}>Empty 7L</button>
              <button className="btn-primary" onClick={() => handleJug('empty4')}>Empty 4L</button>
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
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px', fontStyle: 'italic', lineHeight: '1.6' }}>
              <p>The core is cooled, but the facility is plunged into complete isolation. The communications room is sealed shut by a safety lock, and the internal digital clocks are fried. To open the antennas and transmit an SOS signal to the outside world, you must track a precise operational window using archaic equipment.</p>
            </div>
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
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px', fontStyle: 'italic', lineHeight: '1.6' }}>
              <p>The manual override succeeds, the SOS transmission goes out, and the main extraction lift powers up! However, toxic gas is now filling the ventilation system, structural damage is spreading, and the elevator has strict capacity safety parameters. You must choose the final rescue group.</p>
            </div>
            <p>Select the optimal rescue group. Max Capacity: 100.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0' }}>
              {crewOptions.map(crew => (
                <div 
                  key={crew.id} 
                  onClick={() => handleCrewClick(crew.id)}
                  style={{ 
                    padding: '10px', border: '1px solid var(--gold-accent)', borderRadius: '4px', cursor: 'pointer',
                    background: selectedCrew.includes(crew.id) ? 'var(--gold-accent)' : 'transparent',
                    color: selectedCrew.includes(crew.id) ? '#000' : 'var(--text-main)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                  }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{crew.id}</span>
                  <span style={{ fontSize: '0.8rem' }}>W: {crew.w} | V: {crew.v}</span>
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
