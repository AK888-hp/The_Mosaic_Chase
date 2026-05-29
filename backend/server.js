require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const apiRoutes = require('./routes/api');
const Team = require('./models/Team');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Game Validation Logic
const validateHanoi = (moves) => {
  let pegs = [[1, 2, 3], [], []];
  for (let move of moves) {
    const { from, to } = move;
    if (pegs[from].length === 0) return false;
    const disc = pegs[from][0];
    if (pegs[to].length > 0 && pegs[to][0] < disc) return false; // Rule violation
    pegs[from].shift();
    pegs[to].unshift(disc);
  }
  return pegs[2].length === 3 && pegs[2][0] === 1; // Solved
};

const validateNQueens = (queens) => {
  if (queens.length !== 8) return false;
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      let q1 = queens[i], q2 = queens[j];
      if (q1.r === q2.r || q1.c === q2.c || Math.abs(q1.r - q2.r) === Math.abs(q1.c - q2.c)) {
        return false;
      }
    }
  }
  return true;
};

const validateDijkstra = (path) => {
  // Correct path for our graph: A -> C -> F -> G -> H
  const correct = ['A', 'C', 'F', 'G', 'H'];
  if (path.length !== correct.length) return false;
  return path.every((val, index) => val === correct[index]);
};

const validateWaterJug = (actions) => {
  let j5 = 0, j3 = 0;
  for (let action of actions) {
    if (action === 'fill5') j5 = 5;
    else if (action === 'fill3') j3 = 3;
    else if (action === 'empty5') j5 = 0;
    else if (action === 'empty3') j3 = 0;
    else if (action === 'pour5to3') {
      let transfer = Math.min(j5, 3 - j3);
      j5 -= transfer;
      j3 += transfer;
    } else if (action === 'pour3to5') {
      let transfer = Math.min(j3, 5 - j5);
      j3 -= transfer;
      j5 += transfer;
    }
  }
  return j5 === 4;
};

const validateFuses = (actions) => {
  // Expected logic: light A both, light B one -> wait A (30m) -> light B other -> wait B (15m) -> total 45m
  const correct = ['light_a_both', 'light_b_one', 'wait_a', 'light_b_other', 'wait_b'];
  if (actions.length !== correct.length) return false;
  return actions.every((val, index) => val === correct[index]);
};

const validateKnapsack = (selectedIds) => {
  // Items: Eng(w:40, v:50), Med(w:30, v:40), Sec(w:50, v:60), Sci(w:20, v:30), Ops(w:10, v:20). Max W: 100
  // Optimal is Sec, Med, Sci (w: 100, v: 130)
  const optimal = ['Sec', 'Med', 'Sci'].sort();
  const selected = [...selectedIds].sort();
  if (optimal.length !== selected.length) return false;
  return optimal.every((val, index) => val === selected[index]);
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_team_room', (teamCode) => {
    socket.join(teamCode);
  });

  socket.on('admin_join', () => {
    socket.join('admin_room');
  });

  socket.on('submit_task', async (reqData) => {
    try {
      const { teamCode, realm, taskKey, payload } = reqData;
      if (!payload || !payload.data) {
        socket.emit('task_failed', { taskKey, message: 'Invalid payload format. Please refresh your page.' });
        return;
      }
      
      let { data, movesCount } = payload;
      movesCount = movesCount || 0;
      const team = await Team.findOne({ code: teamCode });
      if (!team) return;

      let isValid = false;
      
      if (realm === 'tech') {
        if (taskKey === 'task1') isValid = validateHanoi(data);
        if (taskKey === 'task2') isValid = validateNQueens(data);
        if (taskKey === 'task3') isValid = validateDijkstra(data);
      } else if (realm === 'aptitude') {
        if (taskKey === 'task1') isValid = validateWaterJug(data);
        if (taskKey === 'task2') isValid = validateFuses(data);
        if (taskKey === 'task3') isValid = validateKnapsack(data);
      }

      if (isValid) {
        team.scores[realm][taskKey].completed = true;
        team.scores[realm][taskKey].points = movesCount;
        team.pieces[realm] += 6;
        await team.save();
        
        socket.emit('task_success', { taskKey });
        io.to(teamCode).emit('team_update', team);
        io.to('admin_room').emit('admin_update');
      } else {
        socket.emit('task_failed', { taskKey, message: 'Validation failed. Incorrect solution or rule violation.' });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('place_jigsaw_piece', async (data) => {
    const { teamCode, index, pieceId } = data;
    try {
      const team = await Team.findOne({ code: teamCode });
      if (team) {
        if (!team.jigsawState) team.jigsawState = new Array(36).fill(null);
        team.jigsawState.set(index, pieceId);
        
        let correctCount = 0;
        team.jigsawState.forEach((piece, i) => {
          if (piece === i) correctCount++;
        });
        team.scores.jigsaw = correctCount;
        
        if (correctCount === 36 && !team.completed) {
          team.completed = true;
          team.endTime = new Date();
        }
        
        await team.save();
        io.to(teamCode).emit('team_update', team);
        io.to('admin_room').emit('admin_update');
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
