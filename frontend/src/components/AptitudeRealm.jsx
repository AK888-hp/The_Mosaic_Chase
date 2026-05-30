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
  const [activeMenu, setActiveMenu] = useState(null); // 7 or 4

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

  const undoJug = () => {
    if (jugActions.length > 0) {
      setJugActions(jugActions.slice(0, -1));
      const newHistory = jugHistory.slice(0, -1);
      setJugHistory(newHistory);
      const lastState = newHistory[newHistory.length - 1];
      setJ7(lastState.j7);
      setJ4(lastState.j4);
    }
    setActiveMenu(null);
  };

  const resetJug = () => {
    setJugActions([]); setJugHistory([{ j7: 0, j4: 0 }]); setJ7(0); setJ4(0); setActiveMenu(null);
  };

  const submitWaterJug = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, realm: 'aptitude', taskKey: 'task1', 
      payload: { data: jugActions, movesCount: jugActions.length } 
    });
  };

  const renderJugMenu = (jugCapacity) => {
    if (activeMenu !== jugCapacity) return null;
    const currentVol = jugCapacity === 7 ? j7 : j4;
    const otherCap = jugCapacity === 7 ? 4 : 7;
    const otherVol = jugCapacity === 7 ? j4 : j7;
    
    return (
      <div style={{ position: 'absolute', bottom: '20%', left: '105%', background: '#333', padding: '10px', borderRadius: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '5px', border: '1px solid #555', width: '120px' }}>
        <button className="btn-primary" style={{ padding: '5px', fontSize: '0.8rem', background: '#37474f', opacity: currentVol === jugCapacity ? 0.5 : 1 }} disabled={currentVol === jugCapacity} onClick={(e) => { e.stopPropagation(); applyJugAction(`fill${jugCapacity}`); setActiveMenu(null); }}>Fill</button>
        <button className="btn-primary" style={{ padding: '5px', fontSize: '0.8rem', background: '#37474f', opacity: currentVol === 0 ? 0.5 : 1 }} disabled={currentVol === 0} onClick={(e) => { e.stopPropagation(); applyJugAction(`empty${jugCapacity}`); setActiveMenu(null); }}>Empty</button>
        <button className="btn-primary" style={{ padding: '5px', fontSize: '0.8rem', background: '#37474f', opacity: (currentVol === 0 || otherVol === otherCap) ? 0.5 : 1 }} disabled={currentVol === 0 || otherVol === otherCap} onClick={(e) => { e.stopPropagation(); applyJugAction(`pour${jugCapacity}to${otherCap}`); setActiveMenu(null); }}>Pour to {otherCap}L</button>
      </div>
    );
  };

  // Task 2: Fuses
  const [fuseAMins, setFuseAMins] = useState(60);
  const [fuseBMins, setFuseBMins] = useState(60);
  const [aLitL, setALitL] = useState(false);
  const [aLitR, setALitR] = useState(false);
  const [bLitL, setBLitL] = useState(false);
  const [bLitR, setBLitR] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [fuseClicks, setFuseClicks] = useState(0);
  const [fuseHistory, setFuseHistory] = useState([{ aMins: 60, bMins: 60, aL: false, aR: false, bL: false, bR: false, time: 0 }]);

  const recordFuseHistory = (aM, bM, aL, aR, bL, bR, t) => {
    setFuseHistory([...fuseHistory, { aMins: aM, bMins: bM, aL, aR, bL, bR, time: t }]);
  };

  const toggleFuse = (fuse, end) => {
    setFuseClicks(p=>p+1);
    let nAL = aLitL, nAR = aLitR, nBL = bLitL, nBR = bLitR;
    if (fuse === 'A' && end === 'L' && fuseAMins > 0) nAL = true;
    if (fuse === 'A' && end === 'R' && fuseAMins > 0) nAR = true;
    if (fuse === 'B' && end === 'L' && fuseBMins > 0) nBL = true;
    if (fuse === 'B' && end === 'R' && fuseBMins > 0) nBR = true;
    
    setALitL(nAL); setALitR(nAR); setBLitL(nBL); setBLitR(nBR);
    recordFuseHistory(fuseAMins, fuseBMins, nAL, nAR, nBL, nBR, totalTime);
  };

  const handleWait = () => {
    setFuseClicks(p=>p+1);
    let aRate = (aLitL ? 1 : 0) + (aLitR ? 1 : 0);
    let bRate = (bLitL ? 1 : 0) + (bLitR ? 1 : 0);
    
    let timeStep = 30;
    if (aRate > 0 && (fuseAMins / aRate) < timeStep) timeStep = fuseAMins / aRate;
    if (bRate > 0 && (fuseBMins / bRate) < timeStep) timeStep = fuseBMins / bRate;
    
    if (timeStep === 0) return;

    const nAMins = Math.max(0, fuseAMins - (timeStep * aRate));
    const nBMins = Math.max(0, fuseBMins - (timeStep * bRate));
    const nTime = totalTime + timeStep;
    
    setFuseAMins(nAMins);
    setFuseBMins(nBMins);
    setTotalTime(nTime);
    recordFuseHistory(nAMins, nBMins, aLitL, aLitR, bLitL, bLitR, nTime);
  };

  const undoFuses = () => {
    if (fuseHistory.length > 1) {
      const newHist = fuseHistory.slice(0, -1);
      setFuseHistory(newHist);
      const last = newHist[newHist.length - 1];
      setFuseAMins(last.aMins); setFuseBMins(last.bMins);
      setALitL(last.aL); setALitR(last.aR); setBLitL(last.bL); setBLitR(last.bR);
      setTotalTime(last.time);
    }
  };
  
  const resetFuses = () => {
    setFuseAMins(60); setFuseBMins(60);
    setALitL(false); setALitR(false); setBLitL(false); setBLitR(false);
    setTotalTime(0); setFuseHistory([{ aMins: 60, bMins: 60, aL: false, aR: false, bL: false, bR: false, time: 0 }]);
  };

  const submitFuses = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, realm: 'aptitude', taskKey: 'task2', 
      payload: { data: totalTime, movesCount: fuseClicks } 
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
                <p><strong>Directive:</strong> Isolate exactly 5L of heavy water in the 7L container. Tap a container to open its physical interaction menu.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', margin: '30px 0', alignItems: 'flex-end', height: '180px' }}>
                
                {/* 7L Tank */}
                <div onClick={() => setActiveMenu(activeMenu === 7 ? null : 7)} style={{ width: '90px', height: '140px', border: '4px solid rgba(255,255,255,0.8)', borderTop: 'none', position: 'relative', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '0 0 10px 10px', boxShadow: activeMenu === 7 ? '0 0 15px #64b5f6' : 'none' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j7/7)*100}%`, background: 'rgba(33, 150, 243, 0.7)', transition: 'height 0.4s ease-out', borderRadius: '0 0 6px 6px' }}></div>
                  <div style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>7L GLASS</div>
                  <div style={{ position: 'absolute', width: '100%', textAlign: 'center', color: '#fff', top: '50%', textShadow: '0 0 5px #000' }}>{j7}L</div>
                  {renderJugMenu(7)}
                </div>

                {/* 4L Tank */}
                <div onClick={() => setActiveMenu(activeMenu === 4 ? null : 4)} style={{ width: '70px', height: '80px', border: '4px solid rgba(255,255,255,0.8)', borderTop: 'none', position: 'relative', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '0 0 10px 10px', boxShadow: activeMenu === 4 ? '0 0 15px #64b5f6' : 'none' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${(j4/4)*100}%`, background: 'rgba(33, 150, 243, 0.7)', transition: 'height 0.4s ease-out', borderRadius: '0 0 6px 6px' }}></div>
                  <div style={{ position: 'absolute', bottom: '-30px', width: '100%', textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>4L GLASS</div>
                  <div style={{ position: 'absolute', width: '100%', textAlign: 'center', color: '#fff', top: '50%', textShadow: '0 0 5px #000' }}>{j4}L</div>
                  {renderJugMenu(4)}
                </div>
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
                <p><strong>Directive:</strong> Measure exactly 45 minutes of real time. Click the ends of the physical wires to ignite them, then hit the Progress Time button to simulate burning.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', margin: '40px 0', padding: '20px', background: '#111', borderRadius: '8px' }}>
                
                {/* Wire A Physical Simulation */}
                <div style={{ position: 'relative' }}>
                  <div style={{ color: '#aaa', marginBottom: '10px', fontWeight: 'bold' }}>Thick Wire A (60m) - {fuseAMins}m left</div>
                  <div style={{ width: '100%', height: '12px', background: '#333', position: 'relative', borderRadius: '6px' }}>
                    {/* Visual Burn Progress */}
                    <div style={{ 
                      position: 'absolute', top: 0, bottom: 0, 
                      left: aLitL ? 0 : 'auto', 
                      right: aLitR && !aLitL ? 0 : 'auto', 
                      width: `${(fuseAMins/60)*100}%`, 
                      background: 'repeating-linear-gradient(45deg, #777, #777 10px, #888 10px, #888 20px)',
                      borderRadius: '6px', transition: 'width 0.5s' 
                    }}></div>
                    
                    {/* Left Ignite Hitbox */}
                    <div onClick={() => toggleFuse('A', 'L')} style={{ position: 'absolute', top: '-15px', left: '-15px', width: '30px', height: '30px', background: 'transparent', cursor: 'pointer', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {aLitL && fuseAMins > 0 ? <span style={{ fontSize: '1.5rem', animation: 'flicker 0.5s infinite' }}>🔥</span> : <div style={{ width: '10px', height: '10px', background: '#aaa', borderRadius: '50%' }}></div>}
                    </div>

                    {/* Right Ignite Hitbox */}
                    <div onClick={() => toggleFuse('A', 'R')} style={{ position: 'absolute', top: '-15px', right: '-15px', width: '30px', height: '30px', background: 'transparent', cursor: 'pointer', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {aLitR && fuseAMins > 0 ? <span style={{ fontSize: '1.5rem', animation: 'flicker 0.5s infinite' }}>🔥</span> : <div style={{ width: '10px', height: '10px', background: '#aaa', borderRadius: '50%' }}></div>}
                    </div>
                  </div>
                </div>

                {/* Wire B Physical Simulation */}
                <div style={{ position: 'relative' }}>
                  <div style={{ color: '#aaa', marginBottom: '10px', fontWeight: 'bold' }}>Thin Wire B (60m) - {fuseBMins}m left</div>
                  <div style={{ width: '100%', height: '8px', background: '#333', position: 'relative', borderRadius: '4px' }}>
                    {/* Visual Burn Progress */}
                    <div style={{ 
                      position: 'absolute', top: 0, bottom: 0, 
                      left: bLitL ? 0 : 'auto', 
                      right: bLitR && !bLitL ? 0 : 'auto', 
                      width: `${(fuseBMins/60)*100}%`, 
                      background: 'repeating-linear-gradient(45deg, #999, #999 10px, #aaa 10px, #aaa 20px)',
                      borderRadius: '4px', transition: 'width 0.5s' 
                    }}></div>
                    
                    {/* Left Ignite Hitbox */}
                    <div onClick={() => toggleFuse('B', 'L')} style={{ position: 'absolute', top: '-15px', left: '-15px', width: '30px', height: '30px', background: 'transparent', cursor: 'pointer', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {bLitL && fuseBMins > 0 ? <span style={{ fontSize: '1.5rem', animation: 'flicker 0.5s infinite' }}>🔥</span> : <div style={{ width: '10px', height: '10px', background: '#aaa', borderRadius: '50%' }}></div>}
                    </div>

                    {/* Right Ignite Hitbox */}
                    <div onClick={() => toggleFuse('B', 'R')} style={{ position: 'absolute', top: '-15px', right: '-15px', width: '30px', height: '30px', background: 'transparent', cursor: 'pointer', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {bLitR && fuseBMins > 0 ? <span style={{ fontSize: '1.5rem', animation: 'flicker 0.5s infinite' }}>🔥</span> : <div style={{ width: '10px', height: '10px', background: '#aaa', borderRadius: '50%' }}></div>}
                    </div>
                  </div>
                </div>
                
                <style>{`@keyframes flicker { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }`}</style>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', padding: '15px', background: 'rgba(255, 183, 77, 0.1)', border: '1px solid #ffb74d', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.2rem', color: '#ffb74d', fontWeight: 'bold' }}>Simulated Time Elapsed: {totalTime} mins</span>
                <button className="btn-primary" onClick={handleWait} style={{ background: '#ffb74d', color: '#000', padding: '10px 20px' }}>Progress Time ⏱️</button>
              </div>
              
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
