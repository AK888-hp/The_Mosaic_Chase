import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';

// Components
import Landing from './components/Landing';
import StorylineIntro from './components/StorylineIntro';
import TechRealm from './components/TechRealm';
import AptitudeRealm from './components/AptitudeRealm';
import JigsawFusion from './components/JigsawFusion';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

// Socket instance
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
const socket = io(BACKEND_URL);

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

function PageWrapper({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({ teamState, setTeamState, setPlayerRole, socket }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={<PageWrapper><Landing setTeamState={setTeamState} setPlayerRole={setPlayerRole} socket={socket} /></PageWrapper>} 
        />
        <Route 
          path="/storyline" 
          element={<PageWrapper><StorylineIntro teamState={teamState} /></PageWrapper>} 
        />
        <Route 
          path="/realm/tech" 
          element={<PageWrapper><TechRealm teamState={teamState} socket={socket} /></PageWrapper>} 
        />
        <Route 
          path="/realm/aptitude" 
          element={<PageWrapper><AptitudeRealm teamState={teamState} socket={socket} /></PageWrapper>} 
        />
        <Route 
          path="/fusion" 
          element={<PageWrapper><JigsawFusion teamState={teamState} socket={socket} /></PageWrapper>} 
        />
        <Route path="/admin" element={<PageWrapper><AdminLogin /></PageWrapper>} />
        <Route path="/admin/dashboard" element={<PageWrapper><AdminDashboard socket={socket} /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function Header({ teamState }) {
  const location = useLocation();
  return (
    <header>
      <div className="logo-container">
        <img src="/logo.png" alt="Mosaic Chase Logo" />
      </div>
      <div className="brand-title">The Mosaic Chase</div>
      {teamState && location.pathname !== '/' && (
        <div className="team-info" style={{ textAlign: 'right' }}>
          <div>Team: {teamState.code}</div>
          <div style={{ color: 'var(--gold-accent)' }}>Score: {teamState.totalScore || 0}</div>
        </div>
      )}
    </header>
  );
}

function App() {
  const [teamState, setTeamState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // 'player1' or 'player2'

  useEffect(() => {
    socket.on('team_update', (data) => {
      setTeamState(data);
    });

    const savedCode = localStorage.getItem('teamCode');
    const savedRole = localStorage.getItem('playerRole');
    
    if (savedCode && savedRole && !teamState) {
      fetch(`${BACKEND_URL}/api/team/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: savedCode, playerRole: savedRole, isRejoin: true })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setTeamState(data);
          setPlayerRole(savedRole);
          socket.emit('join_team_room', data.code);
        } else {
          localStorage.removeItem('teamCode');
          localStorage.removeItem('playerRole');
        }
      }).catch(console.error);
    }

    return () => {
      socket.off('team_update');
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Header teamState={teamState} />
        
        <main>
          <AnimatedRoutes 
            teamState={teamState} 
            setTeamState={setTeamState} 
            setPlayerRole={setPlayerRole} 
            socket={socket} 
          />
        </main>
      </div>
    </Router>
  );
}

export default App;
