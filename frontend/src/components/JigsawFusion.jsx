import React, { useState, useEffect } from 'react';

function JigsawFusion({ teamState, socket }) {
  const [selectedPiece, setSelectedPiece] = useState(null);
  
  if (!teamState) return <div>Loading... Please join a team first.</div>;

  const isTechDone = teamState.scores?.tech?.task3?.completed;
  const isAptitudeDone = teamState.scores?.aptitude?.task3?.completed;

  if (!isTechDone || !isAptitudeDone) {
    return (
      <div className="wood-card" style={{ textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Both the Technology and Aptitude realms must be secured before the Nexus Mosaic can be restored.</p>
      </div>
    );
  }

  const totalPiecesEarned = teamState.pieces.tech + teamState.pieces.aptitude;
  const gridState = teamState.jigsawState || new Array(36).fill(null);

  // Available pieces (0 to 35) that haven't been placed on the grid yet
  const availablePieces = Array.from({ length: totalPiecesEarned }).map((_, i) => i)
    .filter(pieceIndex => !gridState.includes(pieceIndex));

  const handlePieceClick = (pieceId) => {
    if (selectedPiece === pieceId) {
      setSelectedPiece(null);
    } else {
      setSelectedPiece(pieceId);
    }
  };

  const handleSlotClick = (dropIndex) => {
    if (selectedPiece !== null && gridState[dropIndex] === null) {
      socket.emit('place_jigsaw_piece', {
        teamCode: teamState.code,
        index: dropIndex,
        pieceId: selectedPiece
      });
      setSelectedPiece(null);
    }
  };

  const handleDragStart = (e, pieceId, isFromGrid, gridIndex) => {
    e.dataTransfer.setData('pieceId', pieceId);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const pieceId = parseInt(e.dataTransfer.getData('pieceId'));
    
    if (gridState[dropIndex] === null) {
      socket.emit('place_jigsaw_piece', {
        teamCode: teamState.code,
        index: dropIndex,
        pieceId: pieceId
      });
    }
  };

  const allowDrop = (e) => {
    e.preventDefault();
  };

  const getBackgroundPosition = (index) => {
    const x = (index % 6) * 20; // 0, 20, 40, 60, 80, 100 %
    const y = Math.floor(index / 6) * 20;
    return `${x}% ${y}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <h2 style={{ color: 'var(--gold-accent)' }}>Phase 2: Jigsaw Fusion</h2>
      <p>Pieces Recovered: {totalPiecesEarned} / 36</p>
      
      {teamState.completed && (
        <div style={{ background: 'var(--success)', padding: '10px 20px', borderRadius: '8px', marginBottom: '20px', color: '#fff', fontWeight: 'bold' }}>
          MOSAIC RESTORED! TIME LOGGED.
        </div>
      )}

      {/* Jigsaw Grid */}
      <div className="jigsaw-container">
        {gridState.map((pieceId, index) => (
          <div 
            key={index} 
            className="jigsaw-slot"
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => handleSlotClick(index)}
          >
            {pieceId !== null && (
              <div 
                className="jigsaw-piece"
                draggable={!teamState.completed}
                onDragStart={(e) => handleDragStart(e, pieceId, true, index)}
                style={{
                  backgroundImage: 'url(/mosaic.png)',
                  backgroundPosition: getBackgroundPosition(pieceId)
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Tray of available pieces */}
      <div style={{ marginTop: '30px', width: '90vw', maxWidth: '600px' }}>
        <h3>Fragment Tray</h3>
        <div className="pieces-tray">
          {availablePieces.length === 0 && <p style={{ opacity: 0.5 }}>No available fragments in the tray.</p>}
          {availablePieces.map(pieceId => (
            <div 
              key={pieceId}
              className="tray-piece"
              draggable={!teamState.completed}
              onDragStart={(e) => handleDragStart(e, pieceId, false, null)}
              onClick={() => handlePieceClick(pieceId)}
              style={{
                backgroundImage: 'url(/mosaic.png)',
                backgroundPosition: getBackgroundPosition(pieceId),
                border: selectedPiece === pieceId ? '3px solid var(--gold-accent)' : '1px solid rgba(255,255,255,0.2)',
                transform: selectedPiece === pieceId ? 'scale(1.05)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default JigsawFusion;
