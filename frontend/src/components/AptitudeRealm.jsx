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
    if (teamState?.jigsawInitiated) {
      navigate('/fusion');
    }
  }, [teamState?.jigsawInitiated, navigate]);

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
  const [jugHistory, setJugHistory] = useState([{ j7: 0, j4: 0 }]);
  const [j7, setJ7] = useState(0);
  const [j4, setJ4] = useState(0);
  const [selectedJug, setSelectedJug] = useState(null);

  const applyJugAction = (action) => {
    setJugActions(prev => [...prev, action]);
    let new7 = j7;
    let new4 = j4;
    
    if (action === 'fill7') new7 = 7;
    if (action === 'fill4') new4 = 4;
    if (action === 'empty7') new7 = 0;
    if (action === 'empty4') new4 = 0;
    if (action === 'pour7to4') {
      let transfer = Math.min(new7, 4 - new4);
      new7 -= transfer;
      new4 += transfer;
    }
    if (action === 'pour4to7') {
      let transfer = Math.min(new4, 7 - new7);
      new4 -= transfer;
      new7 += transfer;
    }
    
    setJ7(new7);
    setJ4(new4);
    setJugHistory([...jugHistory, { j7: new7, j4: new4 }]);
  };

  const handleJugClick = (jug) => {
    if (selectedJug === null) {
      setSelectedJug(jug); // Select first jug
    } else {
      if (selectedJug === 7 && jug === 4) applyJugAction('pour7to4');
      if (selectedJug === 4 && jug === 7) applyJugAction('pour4to7');
      setSelectedJug(null);
    }
  };

  const undoJug = () => {
    if (jugActions.length > 0) {
      setJugActions(jugActions.slice(0, -1));
      const newHistory = jugHistory.slice(0, -1);
      setJugHistory(newHistory);
      const lastState = newHistory[newHistory.length - 1];
      setJ7(lastState.j7);
      setJ4(lastState.j4);
    }
    setSelectedJug(null);
  };

  const resetJug = () => {
    setJugActions([]); setJugHistory([{ j7: 0, j4: 0 }]); setJ7(0); setJ4(0); setSelectedJug(null);
  };

  const submitWaterJug = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, realm: 'aptitude', taskKey: 'task1', 
      payload: { data: jugActions, movesCount: jugActions.length } 
    });
  };

  // Task 2: Fuses
  const [fuseActions, setFuseActions] = useState([]);
  const [fuseClicks, setFuseClicks] = useState(0);

  // Fuse visuals state derived from actions
  let fuseALength = 100, fuseBLength = 100;
  let aLitBoth = false, bLitOne = false, bLitOther = false;
  fuseActions.forEach(action => {
    if (action === 'light_a_both') aLitBoth = true;
    if (action === 'light_b_one') bLitOne = true;
    if (action === 'wait_a') {
      if (aLitBoth) fuseALength = 0;
      if (bLitOne) fuseBLength -= 50;
    }
    if (action === 'light_b_other') bLitOther = true;
    if (action === 'wait_b') {
      if (bLitOne && bLitOther) fuseBLength = 0;
    }
  });

  const undoFuses = () => {
    if (fuseActions.length > 0) setFuseActions(fuseActions.slice(0, -1));
  };
  
  const resetFuses = () => setFuseActions([]);

  const submitFuses = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, realm: 'aptitude', taskKey: 'task2', 
      payload: { data: fuseActions, movesCount: fuseClicks } 
    });
  };

  // Task 3: Knapsack Cart
  const crewOptions = [
    { id: 'Commander', w: 25, v: 50 }, { id: 'Engineer', w: 40, v: 45 }, { id: 'Medic', w: 20, v: 40 },
    { id: 'Security', w: 50, v: 60 }, { id: 'Scientist', w: 30, v: 35 }, { id: 'Operations', w: 15, v: 25 },
    { id: 'Comms', w: 10, v: 15 }, { id: 'Pilot', w: 35, v: 55 }, { id: 'Navigator', w: 20, v: 30 }, { id: 'Gunner', w: 45, v: 50 }
  ];
  const [selectedCrew, setSelectedCrew] = useState([]);
  const [crewClicks, setCrewClicks] = useState(0);

  const handleCrewDragStart = (e, id) => e.dataTransfer.setData('crewId', id);
  const handleCrewDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('crewId');
    if (id && !selectedCrew.includes(id)) {
      setCrewClicks(prev => prev + 1);
      setSelectedCrew([...selectedCrew, id]);
    }
  };

  const removeCrew = (id) => {
    setCrewClicks(prev => prev + 1);
    setSelectedCrew(selectedCrew.filter(x => x !== id));
  };

  const undoKnapsack = () => {
    if (selectedCrew.length > 0) setSelectedCrew(selectedCrew.slice(0, -1));
  };
  const resetKnapsack = () => setSelectedCrew([]);

  const currentWeight = selectedCrew.reduce((acc, id) => acc + crewOptions.find(c => c.id === id).w, 0);

  const submitKnapsack = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, realm: 'aptitude', taskKey: 'task3', 
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
    if (!teamState && !localStorage.getItem('teamCode')) navigate('/');
  }, [teamState, navigate]);

  if (!teamState) return <div style={{ textAlign: 'center', marginTop: '50px' }}><h3>Loading terminal...</h3></div>;

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
                <p><strong>Directive:</strong> Isolate exactly 5L of heavy water in the 7L container. Tap the Source to fill, Drain to empty, and tap between containers to pour.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', margin: '30px 0', alignItems: 'flex-end', height: '180px' }}>
                
                {/* Source */}
                <div onClick={() => selectedJug && applyJugAction(`fill${selectedJug}`)} style={{ width: '60px', height: '60px', background: '#37474f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #64b5f6', color: '#64b5f6' }}>Source</div>

                <div onClick={() => handleJugClick(7)} style={{ width: '90px', height: '140px', border: '4px solid #888', borderTop: 'none', position: 'relative', background: '#111', cursor: 'pointer', borderColor: selectedJug === 7 ? '#ffb74d' : '#888' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j7/7)*100}%`, background: 'rgba(33, 150, 243, 0.8)', transition: 'height 0.4s ease-out' }}></div>
                  <div style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', color: '#aaa' }}>7L TANK</div>
                  <div style={{ position: 'absolute', width: '100%', textAlign: 'center', color: '#fff', top: '50%' }}>{j7}L</div>
                </div>

                <div onClick={() => handleJugClick(4)} style={{ width: '70px', height: '80px', border: '4px solid #888', borderTop: 'none', position: 'relative', background: '#111', cursor: 'pointer', borderColor: selectedJug === 4 ? '#ffb74d' : '#888' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j4/4)*100}%`, background: 'rgba(33, 150, 243, 0.8)', transition: 'height 0.4s ease-out' }}></div>
                  <div style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', color: '#aaa' }}>4L TANK</div>
                  <div style={{ position: 'absolute', width: '100%', textAlign: 'center', color: '#fff', top: '50%' }}>{j4}L</div>
                </div>

                {/* Drain */}
                <div onClick={() => selectedJug && applyJugAction(`empty${selectedJug}`)} style={{ width: '60px', height: '60px', background: '#37474f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #ef5350', color: '#ef5350' }}>Drain</div>
              </div>

              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0', color: '#aaa', marginTop: '50px' }}>Moves Registered: <strong>{jugActions.length}</strong></p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button className="btn-primary" onClick={undoJug} style={{ flex: 1, background: '#222', color: '#fff' }}>UNDO</button>
                <button className="btn-primary" onClick={resetJug} style={{ flex: 1, background: '#222', color: '#fff' }}>RESET</button>
              </div>
              <button className="btn-primary" onClick={submitWaterJug} style={{ width: '100%', background: '#ffb74d', color: '#000' }}>EXECUTE DUMP PROTOCOL</button>
            </div>
          )}

          {currentTask === 2 && !isTask2Done && (
            <div>
              <h3 style={{ color: '#ffb74d' }}>OFFLINE: Restoring Communications</h3>
              <div style={{ padding: '15px', background: '#2c2c2c', borderLeft: '4px solid #ffb74d', marginBottom: '20px', lineHeight: '1.6' }}>
                <p><strong>Directive:</strong> Use two uneven 60-minute fuses (A and B) to measure exactly 45 minutes.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', margin: '30px 0', padding: '20px', background: '#111', borderRadius: '8px' }}>
                {/* Fuse A Visual */}
                <div>
                  <div style={{ color: '#aaa', marginBottom: '5px' }}>Fuse A (60m)</div>
                  <div style={{ width: '100%', height: '10px', background: '#333', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-5px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ width: '20px', height: '20px', background: aLitBoth ? '#ff5252' : '#888', borderRadius: '50%', boxShadow: aLitBoth ? '0 0 10px red' : 'none' }}></div>
                      <div style={{ width: '20px', height: '20px', background: aLitBoth ? '#ff5252' : '#888', borderRadius: '50%', boxShadow: aLitBoth ? '0 0 10px red' : 'none' }}></div>
                    </div>
                    <div style={{ width: `${fuseALength}%`, height: '100%', background: '#ffb74d', margin: '0 auto', transition: 'width 0.5s' }}></div>
                  </div>
                </div>

                {/* Fuse B Visual */}
                <div>
                  <div style={{ color: '#aaa', marginBottom: '5px' }}>Fuse B (60m)</div>
                  <div style={{ width: '100%', height: '10px', background: '#333', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-5px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ width: '20px', height: '20px', background: bLitOne || bLitOther ? '#ff5252' : '#888', borderRadius: '50%', boxShadow: bLitOne ? '0 0 10px red' : 'none' }}></div>
                      <div style={{ width: '20px', height: '20px', background: bLitOther ? '#ff5252' : '#888', borderRadius: '50%', boxShadow: bLitOther ? '0 0 10px red' : 'none' }}></div>
                    </div>
                    <div style={{ width: `${fuseBLength}%`, height: '100%', background: '#ffb74d', transition: 'width 0.5s' }}></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '20px 0' }}>
                {['light_a_both', 'light_b_one', 'wait_a', 'light_b_other', 'wait_b'].map(action => (
                  <button 
                    key={action}
                    className="btn-primary" 
                    style={{ flex: '1 1 30%', background: fuseActions.includes(action) ? '#ffb74d' : '#37474f', color: fuseActions.includes(action) ? '#000' : '#fff', border: '1px solid #555' }}
                    onClick={() => {
                      setFuseClicks(prev => prev + 1);
                      if(!fuseActions.includes(action)) setFuseActions([...fuseActions, action]);
                    }}>
                    {action.replace(/_/g, ' ').toUpperCase()}
                  </button>
                ))}
              </div>
              <p style={{ color: '#aaa' }}>Buffer: [ {fuseActions.join(' ] -> [ ')} ]</p>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button className="btn-primary" onClick={undoFuses} style={{ flex: 1, background: '#222', color: '#fff' }}>UNDO</button>
                <button className="btn-primary" onClick={resetFuses} style={{ flex: 1, background: '#222', color: '#fff' }}>RESET</button>
              </div>
              <button className="btn-primary" onClick={submitFuses} style={{ width: '100%', background: '#ffb74d', color: '#000' }}>TRANSMIT SIGNAL</button>
            </div>
          )}

          {currentTask === 3 && !isTask3Done && (
            <div>
              <h3 style={{ color: '#ffb74d' }}>ALERT: The Evacuation Directive</h3>
              <div style={{ padding: '15px', background: '#2c2c2c', borderLeft: '4px solid #ffb74d', marginBottom: '20px', lineHeight: '1.6' }}>
                <p><strong>Directive:</strong> Drag and drop the optimal rescue group into the Evacuation Lift without exceeding the capacity of 100.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', md: { flexDirection: 'row' } }}>
                {/* Available Crew */}
                <div style={{ flex: 1, border: '1px solid #555', padding: '10px', borderRadius: '8px' }}>
                  <h4 style={{ textAlign: 'center', color: '#aaa', margin: '0 0 10px 0' }}>Available Crew</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    {crewOptions.filter(c => !selectedCrew.includes(c.id)).map(crew => (
                      <div 
                        key={crew.id} 
                        draggable
                        onDragStart={(e) => handleCrewDragStart(e, crew.id)}
                        onClick={() => { setCrewClicks(p=>p+1); setSelectedCrew([...selectedCrew, crew.id]) }}
                        style={{ padding: '8px', border: '1px solid #777', borderRadius: '4px', background: '#222', cursor: 'grab', fontSize: '0.9rem' }}>
                        <div>{crew.id}</div>
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>W: {crew.w} | V: {crew.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evacuation Lift Dropzone */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleCrewDrop}
                  style={{ flex: 1, border: `2px dashed ${currentWeight > 100 ? '#ff5252' : '#66BB6A'}`, padding: '20px', borderRadius: '8px', minHeight: '150px', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ textAlign: 'center', color: currentWeight > 100 ? '#ff5252' : '#66BB6A', margin: '0 0 10px 0' }}>
                    Evacuation Lift ( {currentWeight} / 100 )
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    {selectedCrew.length === 0 && <div style={{ color: '#555', marginTop: '20px' }}>Drag Crew Here...</div>}
                    {selectedCrew.map(id => {
                      const crew = crewOptions.find(c => c.id === id);
                      return (
                        <div 
                          key={crew.id} 
                          onClick={() => removeCrew(crew.id)}
                          style={{ padding: '8px', border: '1px solid #ffb74d', borderRadius: '4px', background: 'rgba(255, 183, 77, 0.2)', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <div>{crew.id} ✖</div>
                          <div style={{ color: '#ffb74d', fontSize: '0.8rem' }}>W: {crew.w}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', margin: '20px 0 15px 0' }}>
                <button className="btn-primary" onClick={undoKnapsack} style={{ flex: 1, background: '#222', color: '#fff' }}>UNDO</button>
                <button className="btn-primary" onClick={resetKnapsack} style={{ flex: 1, background: '#222', color: '#fff' }}>RESET</button>
              </div>
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
                </div>
              ) : (
                <button 
                  className="btn-primary" 
                  onClick={() => socket.emit('initiate_fusion', { teamCode: teamState.code })} 
                  style={{ width: '100%', marginTop: '30px', padding: '20px', fontSize: '1.5rem', background: '#66BB6A', color: '#000', border: 'none', boxShadow: '0 0 15px rgba(102, 187, 106, 0.5)' }}
                >
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
