import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard({ socket }) {
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();

  const fetchTeams = async () => {
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
      const response = await fetch(`${BACKEND_URL}/api/admin/teams`);
      const data = await response.json();
      data.sort((a, b) => a.totalScore - b.totalScore); // Lowest score first (Best)
      setTeams(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin');
      return;
    }

    fetchTeams();

    socket.emit('admin_join');

    socket.on('admin_update', () => {
      fetchTeams();
    });

    return () => {
      socket.off('admin_update');
    };
  }, [socket, navigate]);

  const formatTime = (startTime, endTime) => {
    if (!startTime) return 'Not Started';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end - start) / 1000); // seconds
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s ${endTime ? '(Completed)' : '(Running)'}`;
  };

  return (
    <div className="wood-card" style={{ maxWidth: '1000px', width: '95vw' }}>
      <h2>Nexus Control Hub</h2>
      <p style={{ color: 'var(--success)' }}>Real-time telemetry active.</p>

      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--wood-light)', color: 'var(--gold-accent)' }}>
              <th style={{ padding: '10px' }}>Team Code</th>
              <th style={{ padding: '10px' }}>P1 (Tech)</th>
              <th style={{ padding: '10px' }}>P2 (Aptitude)</th>
              <th style={{ padding: '10px' }}>Pieces</th>
              <th style={{ padding: '10px' }}>Mosaic Score</th>
              <th style={{ padding: '10px' }}>Total Pts</th>
              <th style={{ padding: '10px' }}>Time Status</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 && (
              <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>No teams registered yet.</td></tr>
            )}
            {teams.map(team => (
              <tr key={team._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{team.code}</td>
                <td style={{ padding: '10px' }}>{team.players.player1 ? 'Active' : 'Waiting'}</td>
                <td style={{ padding: '10px' }}>{team.players.player2 ? 'Active' : 'Waiting'}</td>
                <td style={{ padding: '10px' }}>{team.pieces.tech + team.pieces.aptitude}/36</td>
                <td style={{ padding: '10px' }}>{team.scores.jigsaw}/36</td>
                <td style={{ padding: '10px', color: 'var(--gold-accent)', fontWeight: 'bold' }}>{team.totalScore}</td>
                <td style={{ padding: '10px' }}>{formatTime(team.startTime, team.endTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;
