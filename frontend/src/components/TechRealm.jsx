import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RewardOverlay from './RewardOverlay';

function TechRealm({ teamState, socket }) {
  const navigate = useNavigate();
  
  const techScores = teamState?.scores?.tech || {};
  const isTask1Done = techScores.task1?.completed;
  const isTask2Done = techScores.task2?.completed;
  const isTask3Done = techScores.task3?.completed;
  
  const aptitudeScores = teamState?.scores?.aptitude || {};
  const isAptitudeDone = aptitudeScores.task3?.completed;

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

  // Task 1: Hanoi State
  const [hanoiPegs, setHanoiPegs] = useState([[1, 2, 3, 4, 5, 6], [], []]);
  const [hanoiMoves, setHanoiMoves] = useState([]);
  const [selectedPeg, setSelectedPeg] = useState(null); // For Mobile Click-to-move

  const handlePegClick = (pegIndex) => {
    if (selectedPeg === null) {
      if (hanoiPegs[pegIndex].length > 0) setSelectedPeg(pegIndex);
    } else {
      if (selectedPeg !== pegIndex) {
        const fromPeg = [...hanoiPegs[selectedPeg]];
        const toPeg = [...hanoiPegs[pegIndex]];
        const disc = fromPeg[0];
        
        if (toPeg.length === 0 || toPeg[0] > disc) {
          fromPeg.shift();
          toPeg.unshift(disc);
          const newPegs = [...hanoiPegs];
          newPegs[selectedPeg] = fromPeg;
          newPegs[pegIndex] = toPeg;
          setHanoiPegs(newPegs);
          setHanoiMoves([...hanoiMoves, { from: selectedPeg, to: pegIndex, disc }]);
        } else {
          setErrorMsg("Invalid move: Cannot place larger disc on a smaller one.");
          setTimeout(() => setErrorMsg(''), 2000);
        }
      }
      setSelectedPeg(null);
    }
  };

  const undoHanoi = () => {
    if (hanoiMoves.length === 0) return;
    const lastMove = hanoiMoves[hanoiMoves.length - 1];
    const newPegs = [...hanoiPegs];
    const toPeg = [...newPegs[lastMove.to]];
    const fromPeg = [...newPegs[lastMove.from]];
    
    const disc = toPeg.shift();
    fromPeg.unshift(disc);
    newPegs[lastMove.to] = toPeg;
    newPegs[lastMove.from] = fromPeg;
    
    setHanoiPegs(newPegs);
    setHanoiMoves(hanoiMoves.slice(0, -1));
    setSelectedPeg(null);
  };

  const resetHanoi = () => {
    setHanoiPegs([[1, 2, 3, 4, 5, 6], [], []]);
    setHanoiMoves([]);
    setSelectedPeg(null);
  };

  const submitHanoi = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, 
      realm: 'tech', 
      taskKey: 'task1', 
      payload: { data: hanoiMoves, movesCount: hanoiMoves.length } 
    });
  };

  // Task 2: N-Queens State
  const [queens, setQueens] = useState([]);
  const [queensMoves, setQueensMoves] = useState(0);

  const handleGridClick = (r, c) => {
    setQueensMoves(prev => prev + 1);
    const existingIndex = queens.findIndex(q => q.r === r && q.c === c);
    if (existingIndex > -1) {
      setQueens(queens.filter((_, i) => i !== existingIndex));
    } else {
      if (queens.length < 8) setQueens([...queens, { r, c }]);
    }
  };

  const undoQueens = () => {
    if (queens.length > 0) setQueens(queens.slice(0, -1));
  };
  const resetQueens = () => setQueens([]);

  const rowCounts = {}; const colCounts = {}; const majDiagCounts = {}; const minDiagCounts = {};
  queens.forEach(q => {
    rowCounts[q.r] = (rowCounts[q.r] || 0) + 1;
    colCounts[q.c] = (colCounts[q.c] || 0) + 1;
    majDiagCounts[q.r - q.c] = (majDiagCounts[q.r - q.c] || 0) + 1;
    minDiagCounts[q.r + q.c] = (minDiagCounts[q.r + q.c] || 0) + 1;
  });

  const hasAnyConflict = Object.values(rowCounts).some(v => v > 1) || 
                         Object.values(colCounts).some(v => v > 1) || 
                         Object.values(majDiagCounts).some(v => v > 1) || 
                         Object.values(minDiagCounts).some(v => v > 1);

  let conflictMessage = "";
  if (Object.values(rowCounts).some(v => v > 1)) conflictMessage += "Row conflict! ";
  if (Object.values(colCounts).some(v => v > 1)) conflictMessage += "Column conflict! ";
  if (Object.values(majDiagCounts).some(v => v > 1) || Object.values(minDiagCounts).some(v => v > 1)) conflictMessage += "Diagonal conflict!";

  const submitNQueens = () => {
    if (hasAnyConflict) {
      setErrorMsg("Cannot submit: Board currently has conflicts.");
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    socket.emit('submit_task', { 
      teamCode: teamState.code, 
      realm: 'tech', 
      taskKey: 'task2', 
      payload: { data: queens, movesCount: queensMoves } 
    });
  };

  // Task 3: Dijkstra State
  const [path, setPath] = useState(['A']);
  const [dijkstraMoves, setDijkstraMoves] = useState(0);

  const handleNodeClick = (node) => {
    setDijkstraMoves(prev => prev + 1);
    if (path[path.length - 1] === node) {
      if (path.length > 1) setPath(path.slice(0, -1));
    } else if (!path.includes(node)) {
      setPath([...path, node]);
    }
  };

  const undoDijkstra = () => {
    if (path.length > 1) setPath(path.slice(0, -1));
  };
  const resetDijkstra = () => setPath(['A']);

  const submitDijkstra = () => {
    socket.emit('submit_task', { 
      teamCode: teamState.code, 
      realm: 'tech', 
      taskKey: 'task3', 
      payload: { data: path, movesCount: dijkstraMoves } 
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
    return <div style={{ textAlign: 'center', marginTop: '50px' }}><h3>Loading game data...</h3></div>;
  }

  return (
    <>
      <RewardOverlay isVisible={showReward} onComplete={handleRewardComplete} piecesEarned={6} />
      
      <div className="wood-card" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Cybernetic Grid (Tech)</h2>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--gold-accent)' }}>
            ⏱ {formatTime(elapsed)}
          </div>
        </div>

        <p style={{ fontStyle: 'italic', marginBottom: '20px', color: '#b0bec5' }}>
          Welcome to the Shadow Grid Chronicles. You must penetrate three deep-layer security systems to access the central core and recover your fragments.
        </p>

        {errorMsg && <div style={{ color: 'var(--danger)', marginBottom: '15px', fontWeight: 'bold' }}>{errorMsg}</div>}
        
        <div style={{ marginTop: '20px' }}>
          {currentTask === 1 && !isTask1Done && (
            <div>
              <h3 style={{ color: '#64b5f6' }}>Layer 1: The Gateway Gateways</h3>
              <p style={{ lineHeight: '1.5' }}>
                The outer perimeter defense system is completely locked up. 
                <strong> Rule: Move all 6 discs to the rightmost spire. Tap a spire to select its top disc, then tap another spire to place it.</strong>
              </p>
              
              <div style={{ display: 'flex', gap: '20px', height: '220px', alignItems: 'flex-end', justifyContent: 'center', margin: '30px 0' }}>
                {hanoiPegs.map((peg, pegIndex) => (
                  <div 
                    key={pegIndex} 
                    onClick={() => handlePegClick(pegIndex)}
                    style={{ 
                      width: '120px', height: '100%', border: 'none', 
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative',
                      cursor: 'pointer',
                      background: selectedPeg === pegIndex ? 'rgba(100, 181, 246, 0.2)' : 'transparent',
                      borderRadius: '8px'
                    }}>
                    <div style={{ position: 'absolute', bottom: 0, width: '12px', height: '100%', background: 'var(--wood-medium)', borderRadius: '6px 6px 0 0', zIndex: 0 }}></div>
                    <div style={{ position: 'absolute', bottom: -10, width: '100%', height: '10px', background: 'var(--wood-medium)', borderRadius: '4px', zIndex: 0 }}></div>
                    {peg.map((disc, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          width: `${30 + disc * 11}%`, height: '20px', 
                          background: `hsl(${200 + disc * 15}, 80%, 45%)`, 
                          borderRadius: '6px', zIndex: 1, border: '2px solid rgba(0,0,0,0.3)',
                          boxShadow: (selectedPeg === pegIndex && idx === 0) ? '0 0 10px #fff' : '0 2px 4px rgba(0,0,0,0.4)',
                          marginBottom: '2px',
                          transform: (selectedPeg === pegIndex && idx === 0) ? 'translateY(-10px)' : 'none',
                          transition: 'transform 0.2s'
                        }}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
              
              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0' }}>Score (Clicks/Moves): <strong>{hanoiMoves.length}</strong></p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button className="btn-primary" onClick={undoHanoi} style={{ flex: 1, background: '#37474f' }}>Undo Move</button>
                <button className="btn-primary" onClick={resetHanoi} style={{ flex: 1, background: '#37474f' }}>Reset All</button>
              </div>
              <button className="btn-primary" onClick={submitHanoi} style={{ width: '100%' }}>Submit Configuration</button>
            </div>
          )}

          {currentTask === 2 && !isTask2Done && (
            <div>
              <h3 style={{ color: '#64b5f6' }}>Layer 2: The Mainframe Core</h3>
              <p style={{ lineHeight: '1.5' }}>
                Automated anti-virus bots are launching a counter-attack! 
                <strong> Rule: Deploy 8 elite defensive firewalls (Queens) across the grid. No two firewalls can share the same row, column, or diagonal line.</strong>
              </p>
              {conflictMessage && <div style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '10px' }}>{conflictMessage}</div>}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%', maxWidth: '400px', margin: '20px auto', aspectRatio: '1/1', border: '2px solid var(--wood-accent)' }}>
                {Array.from({ length: 8 }).map((_, r) => 
                  Array.from({ length: 8 }).map((_, c) => {
                    const isBlack = (r + c) % 2 !== 0;
                    const hasQueen = queens.some(q => q.r === r && q.c === c);
                    const isConflict = rowCounts[r] > 1 || colCounts[c] > 1 || majDiagCounts[r-c] > 1 || minDiagCounts[r+c] > 1;
                    
                    return (
                      <div 
                        key={`${r}-${c}`} 
                        onClick={() => handleGridClick(r, c)}
                        style={{ 
                          background: isBlack ? '#1a237e' : '#e8eaf6', 
                          display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                          fontSize: '30px', position: 'relative'
                        }}>
                        {isConflict && <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(255, 0, 0, 0.4)', zIndex: 0 }}></div>}
                        <span style={{ zIndex: 1, color: isBlack ? '#fff' : '#000', textShadow: isConflict ? '0 0 5px red' : 'none' }}>{hasQueen ? '🛡️' : ''}</span>
                      </div>
                    )
                  })
                )}
              </div>
              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0' }}>Score (Clicks/Moves): <strong>{queensMoves}</strong></p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button className="btn-primary" onClick={undoQueens} style={{ flex: 1, background: '#37474f' }}>Undo Queen</button>
                <button className="btn-primary" onClick={resetQueens} style={{ flex: 1, background: '#37474f' }}>Reset Board</button>
              </div>
              <button className="btn-primary" onClick={submitNQueens} style={{ width: '100%' }}>Initialize Firewalls</button>
            </div>
          )}

          {currentTask === 3 && !isTask3Done && (
            <div>
              <h3 style={{ color: '#64b5f6' }}>Layer 3: The Data Safehouse</h3>
              <p style={{ lineHeight: '1.5' }}>
                <strong> Rule: Calculate the absolute shortest path mathematically from Start (A) to Target (H) before a full system lockdown occurs.</strong>
              </p>
              
              <div style={{ width: '100%', maxWidth: '600px', margin: '20px auto', background: '#0a192f', borderRadius: '8px', padding: '10px', overflowX: 'auto', border: '1px solid #64ffda' }}>
                <svg viewBox="0 0 500 300" style={{ width: '100%', minWidth: '400px', height: 'auto' }}>
                  <line x1="50" y1="150" x2="150" y2="50" stroke="#64ffda" strokeWidth="3" />
                  <text x="90" y="90" fill="#fff" fontSize="14">4</text>
                  <line x1="50" y1="150" x2="150" y2="150" stroke="#64ffda" strokeWidth="3" />
                  <text x="100" y="140" fill="#fff" fontSize="14">3</text>
                  <line x1="50" y1="150" x2="150" y2="250" stroke="#64ffda" strokeWidth="3" />
                  <text x="90" y="215" fill="#fff" fontSize="14">6</text>
                  <line x1="150" y1="150" x2="150" y2="50" stroke="#64ffda" strokeWidth="3" />
                  <text x="160" y="105" fill="#fff" fontSize="14">1</text>
                  <line x1="150" y1="250" x2="150" y2="150" stroke="#64ffda" strokeWidth="3" />
                  <text x="160" y="205" fill="#fff" fontSize="14">2</text>
                  <line x1="150" y1="50" x2="250" y2="100" stroke="#64ffda" strokeWidth="3" />
                  <text x="200" y="65" fill="#fff" fontSize="14">5</text>
                  <line x1="150" y1="150" x2="250" y2="100" stroke="#64ffda" strokeWidth="3" />
                  <text x="210" y="140" fill="#fff" fontSize="14">4</text>
                  <line x1="150" y1="150" x2="250" y2="200" stroke="#64ffda" strokeWidth="3" />
                  <text x="210" y="170" fill="#fff" fontSize="14">4</text>
                  <line x1="150" y1="250" x2="250" y2="200" stroke="#64ffda" strokeWidth="3" />
                  <text x="200" y="240" fill="#fff" fontSize="14">3</text>
                  <line x1="250" y1="200" x2="250" y2="100" stroke="#64ffda" strokeWidth="3" />
                  <text x="260" y="155" fill="#fff" fontSize="14">1</text>
                  <line x1="250" y1="100" x2="350" y2="150" stroke="#64ffda" strokeWidth="3" />
                  <text x="310" y="115" fill="#fff" fontSize="14">4</text>
                  <line x1="250" y1="200" x2="350" y2="150" stroke="#64ffda" strokeWidth="3" />
                  <text x="310" y="190" fill="#fff" fontSize="14">3</text>
                  <line x1="350" y1="150" x2="450" y2="150" stroke="#64ffda" strokeWidth="3" />
                  <text x="400" y="140" fill="#fff" fontSize="14">2</text>

                  {[
                    { id: 'A', cx: 50, cy: 150 }, { id: 'B', cx: 150, cy: 50 }, { id: 'C', cx: 150, cy: 150 },
                    { id: 'D', cx: 150, cy: 250 }, { id: 'E', cx: 250, cy: 100 }, { id: 'F', cx: 250, cy: 200 },
                    { id: 'G', cx: 350, cy: 150 }, { id: 'H', cx: 450, cy: 150 }
                  ].map(n => (
                    <g key={n.id} onClick={() => handleNodeClick(n.id)} style={{ cursor: 'pointer' }}>
                      <circle 
                        cx={n.cx} cy={n.cy} r="20" 
                        fill={path.includes(n.id) ? '#64ffda' : '#112240'} 
                        stroke={path[path.length-1] === n.id ? '#fff' : '#000'} strokeWidth="3" 
                      />
                      <text x={n.cx} y={n.cy+5} textAnchor="middle" fill={path.includes(n.id) ? '#000' : '#64ffda'} fontWeight="bold" fontSize="16">{n.id}</text>
                    </g>
                  ))}
                </svg>
              </div>
              
              <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '1.2rem', letterSpacing: '2px', color: '#64ffda' }}>
                Path: {path.join(' ➔ ')}
              </div>
              <p style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0' }}>Score (Clicks/Moves): <strong>{dijkstraMoves}</strong></p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button className="btn-primary" onClick={undoDijkstra} style={{ flex: 1, background: '#112240', color: '#64ffda' }}>Undo Node</button>
                <button className="btn-primary" onClick={resetDijkstra} style={{ flex: 1, background: '#112240', color: '#64ffda' }}>Reset Path</button>
              </div>
              <button className="btn-primary" onClick={submitDijkstra} style={{ width: '100%', background: 'linear-gradient(to bottom, #112240, #0a192f)', borderColor: '#64ffda', color: '#64ffda' }}>Execute Route</button>
            </div>
          )}

          {currentTask === 4 && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <h3 style={{ color: 'var(--success)', fontSize: '2rem' }}>Cybernetic Grid Secured!</h3>
              {!isAptitudeDone ? (
                <div style={{ marginTop: '20px', padding: '25px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--wood-medium)' }}>
                  <p style={{ fontSize: '1.2rem', color: '#b0bec5' }}>Waiting for Player 2 to secure the Survival Outpost (Logic)...</p>
                  <div style={{ marginTop: '20px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTop: '4px solid var(--gold-accent)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <button 
                  className="btn-primary" 
                  onClick={() => socket.emit('initiate_fusion', { teamCode: teamState.code })} 
                  style={{ width: '100%', marginTop: '30px', padding: '20px', fontSize: '1.5rem', boxShadow: '0 0 15px var(--gold-accent)' }}
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

export default TechRealm;
