import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RewardOverlay from './RewardOverlay';

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

  const [showReward, setShowReward] = useState(false);
  const [nextTaskToAdvance, setNextTaskToAdvance] = useState(null);

  useEffect(() => {
    if (isTask1Done && !isTask2Done) setCurrentTask(2);
    if (isTask2Done && !isTask3Done) setCurrentTask(3);
    if (isTask3Done) setCurrentTask(4);
  }, [isTask1Done, isTask2Done, isTask3Done]);

  useEffect(() => {
    const handleSuccess = ({ taskKey }) => {
      setErrorMsg('');
      setShowReward(true);
      if (taskKey === 'task1') setNextTaskToAdvance(2);
      if (taskKey === 'task2') setNextTaskToAdvance(3);
      if (taskKey === 'task3') setNextTaskToAdvance(4);
    };

    socket.on('task_success', handleSuccess);
    socket.on('task_failed', ({ message }) => setErrorMsg(message));

    return () => {
      socket.off('task_success', handleSuccess);
      socket.off('task_failed');
    };
  }, [socket]);

  const handleRewardComplete = () => {
    setShowReward(false);
    if (nextTaskToAdvance) {
      setCurrentTask(nextTaskToAdvance);
      setNextTaskToAdvance(null);
    }
  };

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
    { id: 'Commander', w: 25, v: 50 }, { id: 'Engineer', w: 40, v: 45 }, { id: 'Medic', w: 20, v: 40 },
    { id: 'Security', w: 50, v: 60 }, { id: 'Scientist', w: 30, v: 35 }, { id: 'Operations', w: 15, v: 25 },
    { id: 'Comms', w: 10, v: 15 }, { id: 'Pilot', w: 35, v: 55 }, { id: 'Navigator', w: 20, v: 30 }, { id: 'Gunner', w: 45, v: 50 }
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
        <h3>Loading terminal...</h3>
      </div>
    );
  }

  return (
    <>
      <RewardOverlay isVisible={showReward} onComplete={handleRewardComplete} piecesEarned={6} />

      <div className="wood-card" style={{ maxWidth: '800px', backgroundColor: '#1e1e1e', border: '2px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'monospace', color: '#fff' }}>Survival Outpost (Logic)</h2>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)', fontFamily: 'monospace' }}>
            TIME: {formatTime(elapsed)}
          </div>
        </div>

        {errorMsg && <div style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid red', color: '#ff5252', padding: '10px', marginBottom: '15px', fontFamily: 'monospace', fontWeight: 'bold' }}>[ERR]: {errorMsg}</div>}

        <div style={{ marginTop: '20px', fontFamily: 'monospace' }}>
          {currentTask === 1 && !isTask1Done && (
            <div>
              <h3 style={{ color: '#ffb74d' }}>CRITICAL: Core Meltdown Imminent</h3>
              <div style={{ padding: '15px', background: '#2c2c2c', borderLeft: '4px solid #ffb74d', marginBottom: '20px', lineHeight: '1.6' }}>
                <p>The facility's backup cooling generator is dangerously overheating. Perform an emergency fluid dump immediately.</p>
                <p><strong>Directive:</strong> Isolate exactly 5L of heavy water in the 7L container using only a 7L and 4L unmarked container.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', margin: '30px 0', alignItems: 'flex-end', height: '180px' }}>
                <div style={{ width: '90px', height: '140px', border: '4px solid #888', borderTop: 'none', position: 'relative', background: '#111' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j7/7)*100}%`, background: 'rgba(33, 150, 243, 0.8)', transition: 'height 0.4s ease-out' }}></div>
                  <div style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', color: '#aaa' }}>7L TANK</div>
                </div>
                <div style={{ width: '70px', height: '80px', border: '4px solid #888', borderTop: 'none', position: 'relative', background: '#111' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j4/4)*100}%`, background: 'rgba(33, 150, 243, 0.8)', transition: 'height 0.4s ease-out' }}></div>
                  <div style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', color: '#aaa' }}>4L TANK</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '50px', marginBottom: '20px' }}>
                <button className="btn-primary" style={{ background: '#37474f' }} onClick={() => handleJug('fill7')}>Fill 7L</button>
                <button className="btn-primary" style={{ background: '#37474f' }} onClick={() => handleJug('fill4')}>Fill 4L</button>
                <button className="btn-primary" style={{ background: '#37474f' }} onClick={() => handleJug('pour7to4')}>Pour 7L → 4L</button>
                <button className="btn-primary" style={{ background: '#37474f' }} onClick={() => handleJug('pour4to7')}>Pour 4L → 7L</button>
                <button className="btn-primary" style={{ background: '#37474f' }} onClick={() => handleJug('empty7')}>Purge 7L</button>
                <button className="btn-primary" style={{ background: '#37474f' }} onClick={() => handleJug('empty4')}>Purge 4L</button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0', color: '#aaa' }}>Moves Registered: <strong>{jugActions.length}</strong></p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={resetJug} style={{ flex: 1, background: '#222', color: '#ffb74d' }}>RESET</button>
                <button className="btn-primary" onClick={submitWaterJug} style={{ flex: 2, background: '#ffb74d', color: '#000' }}>EXECUTE DUMP PROTOCOL</button>
              </div>
            </div>
          )}

          {currentTask === 2 && !isTask2Done && (
            <div>
              <h3 style={{ color: '#ffb74d' }}>OFFLINE: Restoring Communications</h3>
              <div style={{ padding: '15px', background: '#2c2c2c', borderLeft: '4px solid #ffb74d', marginBottom: '20px', lineHeight: '1.6' }}>
                <p>The facility is in total isolation. The internal digital clocks are fried. To open the antennas and transmit an SOS signal, track a precise operational window.</p>
                <p><strong>Directive:</strong> Use two uneven 60-minute fuses (A and B) to measure exactly 45 minutes.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '30px 0' }}>
                {['light_a_both', 'light_b_one', 'wait_a', 'light_b_other', 'wait_b'].map(action => (
                  <button 
                    key={action}
                    className="btn-primary" 
                    style={{ background: fuseActions.includes(action) ? '#ffb74d' : '#37474f', color: fuseActions.includes(action) ? '#000' : '#fff', border: '1px solid #555' }}
                    onClick={() => {
                      setFuseClicks(prev => prev + 1);
                      if(fuseActions.includes(action)) setFuseActions(fuseActions.filter(a => a !== action));
                      else setFuseActions([...fuseActions, action]);
                    }}>
                    &gt; {action.replace(/_/g, ' ').toUpperCase()}
                  </button>
                ))}
              </div>
              <p style={{ color: '#aaa' }}>Buffer: [ {fuseActions.join(' ] -> [ ')} ]</p>
              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0', color: '#aaa' }}>Clicks Registered: <strong>{fuseClicks}</strong></p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" onClick={() => setFuseActions([])} style={{ flex: 1, background: '#222', color: '#ffb74d' }}>CLEAR BUFFER</button>
                <button className="btn-primary" onClick={submitFuses} style={{ flex: 2, background: '#ffb74d', color: '#000' }}>TRANSMIT SIGNAL</button>
              </div>
            </div>
          )}

          {currentTask === 3 && !isTask3Done && (
            <div>
              <h3 style={{ color: '#ffb74d' }}>ALERT: The Evacuation Directive</h3>
              <div style={{ padding: '15px', background: '#2c2c2c', borderLeft: '4px solid #ffb74d', marginBottom: '20px', lineHeight: '1.6' }}>
                <p>Toxic gas is filling the vents and the extraction lift is online. The elevator has strict capacity safety parameters.</p>
                <p><strong>Directive:</strong> Select the optimal rescue group without exceeding a maximum weight capacity of 100.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '30px 0' }}>
                {crewOptions.map(crew => (
                  <div 
                    key={crew.id} 
                    onClick={() => handleCrewClick(crew.id)}
                    style={{ 
                      padding: '15px', border: '2px solid', borderRadius: '4px', cursor: 'pointer',
                      borderColor: selectedCrew.includes(crew.id) ? '#ffb74d' : '#555',
                      background: selectedCrew.includes(crew.id) ? 'rgba(255, 183, 77, 0.2)' : '#222',
                      color: selectedCrew.includes(crew.id) ? '#ffb74d' : '#ccc',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                      transition: 'all 0.2s'
                    }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{crew.id}</span>
                    <span style={{ fontSize: '0.9rem', color: '#888' }}>Weight: {crew.w} | Value: {crew.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#111', padding: '15px', border: `2px solid ${currentWeight > 100 ? '#ff5252' : '#66BB6A'}`, marginBottom: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', color: currentWeight > 100 ? '#ff5252' : '#66BB6A' }}>LOAD CAPACITY: {currentWeight} / 100</span>
              </div>
              
              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0', color: '#aaa' }}>Clicks Registered: <strong>{crewClicks}</strong></p>
              <button className="btn-primary" onClick={submitKnapsack} style={{ width: '100%', background: '#ffb74d', color: '#000', fontSize: '1.2rem', padding: '15px' }}>AUTHORIZE MANIFEST</button>
            </div>
          )}

          {currentTask === 4 && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <h3 style={{ color: 'var(--success)', fontSize: '2rem' }}>Outpost Secured!</h3>
              {!isTechDone ? (
                <div style={{ marginTop: '20px', padding: '25px', background: '#2c2c2c', borderRadius: '8px', borderLeft: '4px solid #66BB6A' }}>
                  <p style={{ color: '#aaa', fontSize: '1.1rem' }}>Standby... Awaiting Player 1 to breach the Cybernetic Grid (Tech).</p>
                  <div style={{ marginTop: '20px', border: '4px solid #444', borderTop: '4px solid #66BB6A', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <button className="btn-primary" onClick={() => navigate('/fusion')} style={{ width: '100%', marginTop: '30px', padding: '20px', fontSize: '1.5rem', background: '#66BB6A', color: '#000', border: 'none', boxShadow: '0 0 15px rgba(102, 187, 106, 0.5)' }}>
                  INITIATE JIGSAW FUSION
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AptitudeRealm;
