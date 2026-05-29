import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

// Components (We will create these next)
import Landing from './components/Landing';
import TechRealm from './components/TechRealm';
import AptitudeRealm from './components/AptitudeRealm';
import JigsawFusion from './components/JigsawFusion';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

// Socket instance
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
const socket = io(BACKEND_URL);

function App() {
  const [teamState, setTeamState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // 'player1' or 'player2'

  useEffect(() => {
    socket.on('team_update', (data) => {
      setTeamState(data);
    });

    return () => {
      socket.off('team_update');
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        <header>
          <div className="logo-container">
            <img src="/logo.png" alt="Mosaic Chase Logo" />
          </div>
          <div className="brand-title">The Mosaic Chase</div>
          {teamState && (
            <div className="team-info" style={{ textAlign: 'right' }}>
              <div>Team: {teamState.code}</div>
              <div style={{ color: 'var(--gold-accent)' }}>Score: {teamState.totalScore || 0}</div>
            </div>
          )}
        </header>
        
        <main>
          <Routes>
            <Route 
              path="/" 
              element={<Landing setTeamState={setTeamState} setPlayerRole={setPlayerRole} socket={socket} />} 
            />
            <Route 
              path="/realm/tech" 
              element={<TechRealm teamState={teamState} socket={socket} />} 
            />
            <Route 
              path="/realm/aptitude" 
              element={<AptitudeRealm teamState={teamState} socket={socket} />} 
            />
            <Route 
              path="/fusion" 
              element={<JigsawFusion teamState={teamState} socket={socket} />} 
            />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard socket={socket} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
