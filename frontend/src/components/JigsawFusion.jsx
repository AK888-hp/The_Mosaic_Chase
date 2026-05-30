import React, { useState } from 'react';

function JigsawFusion({ teamState, socket }) {
  const [selectedPiece, setSelectedPiece] = useState(null);
  
  if (!teamState) return <div>Loading terminal...</div>;

  const isTechDone = teamState.scores?.tech?.task3?.completed;
  const isAptitudeDone = teamState.scores?.aptitude?.task3?.completed;

  if (!isTechDone || !isAptitudeDone) {
    return (
      <div className="wood-card" style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p>Both the Cybernetic Grid and Survival Outpost must be completely secured before the Nexus Mosaic can be restored.</p>
      </div>
    );
  }

  const totalPiecesEarned = teamState.pieces.tech + teamState.pieces.aptitude;
  const gridState = teamState.jigsawState || new Array(36).fill(null);

  // Available pieces (0 to 35) that haven't been placed on the grid yet, randomized
  const availablePieces = React.useMemo(() => {
    const pieces = Array.from({ length: totalPiecesEarned })
      .map((_, i) => i)
      .filter(pieceIndex => !gridState.includes(pieceIndex));
    // Fisher-Yates shuffle
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
  }, [totalPiecesEarned, gridState.join(',')]);

  const handlePieceClick = (e, pieceId) => {
    e.stopPropagation();
    if (selectedPiece === pieceId) {
      setSelectedPiece(null);
    } else {
      setSelectedPiece(pieceId);
    }
  };

  const handleSlotClick = (dropIndex) => {
    if (selectedPiece !== null) {
      socket.emit('place_jigsaw_piece', {
        teamCode: teamState.code,
        index: dropIndex,
        pieceId: selectedPiece
      });
      setSelectedPiece(null);
    }
  };

  const handleDragStart = (e, pieceId) => {
    e.dataTransfer.setData('pieceId', pieceId);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const pieceId = parseInt(e.dataTransfer.getData('pieceId'));
    
    socket.emit('place_jigsaw_piece', {
      teamCode: teamState.code,
      index: dropIndex,
      pieceId: pieceId
    });
  };

  const allowDrop = (e) => e.preventDefault();

  const getBackgroundPosition = (index) => {
    const x = (index % 6) * 20;
    const y = Math.floor(index / 6) * 20;
    return `${x}% ${y}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <h2 style={{ color: 'var(--gold-accent)' }}>Phase 2: Jigsaw Fusion</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Pieces Recovered: {totalPiecesEarned} / 36</p>
      
      {teamState.completed && (
        <div style={{ background: 'rgba(102, 187, 106, 0.2)', border: '2px solid var(--success)', padding: '20px', borderRadius: '8px', marginBottom: '30px', color: '#fff', textAlign: 'center', boxShadow: '0 0 20px rgba(102, 187, 106, 0.4)' }}>
          <h2 style={{ color: 'var(--success)', margin: '0 0 10px 0' }}>MOSAIC RESTORED!</h2>
          <p style={{ fontSize: '1.3rem', margin: 0 }}>Final Score: <strong style={{ color: 'var(--gold-accent)' }}>{teamState.totalScore}</strong></p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: '5px 0 0 0' }}>(Score is calculated based on total clicks + time taken. Lower is better!)</p>
        </div>
      )}

      {/* Jigsaw Grid */}
      <div className="jigsaw-container" style={{ background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px', border: '2px solid rgba(255, 255, 255, 0.2)' }}>
        {gridState.map((pieceId, index) => (
          <div 
            key={index} 
            className="jigsaw-slot"
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => handleSlotClick(index)}
            style={{
              background: pieceId === null ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: pieceId === null ? '1px dashed rgba(255, 255, 255, 0.2)' : 'none'
            }}
          >
            {pieceId !== null && (
              <div 
                className="jigsaw-piece"
                draggable={!teamState.completed}
                onDragStart={(e) => handleDragStart(e, pieceId)}
                onClick={(e) => !teamState.completed && handlePieceClick(e, pieceId)}
                style={{
                  backgroundImage: 'url(/mosaic.png)',
                  backgroundPosition: getBackgroundPosition(pieceId),
                  border: selectedPiece === pieceId ? '3px solid var(--gold-accent)' : 'none',
                  transform: selectedPiece === pieceId ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectedPiece === pieceId ? '0 0 10px var(--gold-accent)' : 'none',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Tray of available pieces */}
      <div style={{ marginTop: '30px', width: '90vw', maxWidth: '600px' }}>
        <h3>Fragment Tray</h3>
        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '10px' }}>Drag and drop pieces into the grid, or tap a piece to select it and tap an empty slot to place it.</p>
        <div className="pieces-tray">
          {availablePieces.length === 0 && <p style={{ opacity: 0.5 }}>No available fragments in the tray.</p>}
          {availablePieces.map(pieceId => (
            <div 
              key={pieceId}
              className="tray-piece"
              draggable={!teamState.completed}
              onDragStart={(e) => handleDragStart(e, pieceId)}
              onClick={(e) => handlePieceClick(e, pieceId)}
              style={{
                backgroundImage: 'url(/mosaic.png)',
                backgroundPosition: getBackgroundPosition(pieceId),
                border: selectedPiece === pieceId ? '3px solid var(--gold-accent)' : '1px solid rgba(255,255,255,0.2)',
                transform: selectedPiece === pieceId ? 'scale(1.05)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selectedPiece === pieceId ? '0 0 10px var(--gold-accent)' : 'none',
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Jigsaw Stats & Force Submit */}
      {!teamState.completed && (
        <div style={{ marginTop: '40px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ color: '#aaa', fontFamily: 'monospace' }}>
            Jigsaw Clicks Logged: {teamState.jigsawClicks || 0}
          </div>
          <button 
            className="btn-primary" 
            style={{ background: 'var(--danger)', border: 'none', padding: '15px 30px', fontWeight: 'bold' }}
            onClick={() => {
              if (window.confirm("WARNING: Are you sure you want to force submit? If your mosaic is incomplete, you will incur a massive 1000 point penalty!")) {
                socket.emit('force_submit_jigsaw', { teamCode: teamState.code });
              }
            }}
          >
            FORCE SUBMIT (Incurs Penalty if Incomplete)
          </button>
        </div>
      )}
    </div>
  );
}

export default JigsawFusion;
