const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

// Join or Create a team
router.post('/team/join', async (req, res) => {
  const { code, playerRole, isRejoin } = req.body;
  try {
    let team = await Team.findOne({ code });
    if (!team) {
      team = new Team({ code });
      team.startTime = new Date();
      // Initialize jigsaw array with nulls
      team.jigsawState = new Array(36).fill(null);
    }

    // Check role availability
    if (!isRejoin) {
      if (playerRole === 'player1') {
        if (team.players.player1) return res.status(400).json({ error: 'Player 1 (Tech) is already taken.' });
        team.players.player1 = 'joined';
      } else if (playerRole === 'player2') {
        if (team.players.player2) return res.status(400).json({ error: 'Player 2 (Aptitude) is already taken.' });
        team.players.player2 = 'joined';
      }
    }

    await team.save();
    res.json(team);
  } catch (error) {
    console.error('Join Error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Admin login
router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: 'admin_token_xyz' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin stats
router.get('/admin/teams', async (req, res) => {
  // Normally verify token here
  try {
    const teams = await Team.find().sort({ totalScore: 1, startTime: 1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
