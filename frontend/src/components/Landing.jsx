import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Landing({ setTeamState, setPlayerRole, socket }) {
  const [teamCode, setTeamCode] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!teamCode || !role) {
      setError('Please enter a team code and select a role.');
      return;
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${BACKEND_URL}/api/team/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: teamCode, playerRole: role })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error);
        return;
      }

      setTeamState(data);
      setPlayerRole(role);
      socket.emit('join_team_room', data.code);
      
      if (role === 'player1') {
        navigate('/realm/tech');
      } else {
        navigate('/realm/aptitude');
      }

    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className="wood-card flex-center" style={{ flexDirection: 'column' }}>
      <h2>Enter The Nexus</h2>
      <p style={{ textAlign: 'center', marginBottom: '20px' }}>
        Two isolated realities. One shattered artifact. Join your partner to rebuild the Mosaic.
      </p>
      
      {error && <div style={{ color: 'var(--danger)', marginBottom: '10px' }}>{error}</div>}
      
      <form onSubmit={handleJoin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="text" 
          placeholder="Enter Team Code" 
          className="input-field"
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value)}
        />
        
        <select 
          className="input-field"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select Your Realm</option>
          <option value="player1">Player 1: Technology Realm</option>
          <option value="player2">Player 2: Aptitude Realm</option>
        </select>
        
        <button type="submit" className="btn-primary">Initiate Sequence</button>
      </form>
    </div>
  );
}

export default Landing;
