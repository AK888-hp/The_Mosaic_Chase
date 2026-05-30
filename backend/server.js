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
  let pegs = [[1, 2, 3, 4, 5, 6], [], []];
  for (let move of moves) {
    const { from, to } = move;
    if (pegs[from].length === 0) return false;
    const disc = pegs[from][0];
    if (pegs[to].length > 0 && pegs[to][0] < disc) return false; // Rule violation
    pegs[from].shift();
    pegs[to].unshift(disc);
  }
  return pegs[2].length === 6 && pegs[2][0] === 1; // Solved
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
  let j7 = 0, j4 = 0;
  for (let action of actions) {
    if (action === 'fill7') j7 = 7;
    else if (action === 'fill4') j4 = 4;
    else if (action === 'empty7') j7 = 0;
    else if (action === 'empty4') j4 = 0;
    else if (action === 'pour7to4') {
      let transfer = Math.min(j7, 4 - j4);
      j7 -= transfer;
      j4 += transfer;
    } else if (action === 'pour4to7') {
      let transfer = Math.min(j4, 7 - j7);
      j4 -= transfer;
      j7 += transfer;
    }
  }
  return j7 === 5;
};

const validateFuses = (totalTime) => {
  return totalTime === 45;
};

const validateKnapsack = (selectedIds) => {
  const optimal = ['Commander', 'Medic', 'Navigator', 'Pilot'].sort();
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
        team.totalScore += movesCount; // Add to running total score
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
    const { teamCode, index: dropIndex, pieceId } = data;
    try {
      const team = await Team.findOne({ code: teamCode });
      if (team && !team.completed) {
        if (!team.jigsawState) team.jigsawState = new Array(36).fill(null);
        
        team.jigsawClicks += 1; // Track clicks

        // Prevent piece duplication by clearing its old position if it existed
        const oldIndex = team.jigsawState.findIndex(p => p === pieceId);
        if (oldIndex > -1) {
          team.jigsawState[oldIndex] = null;
        }
        
        // Place in new position
        team.jigsawState[dropIndex] = pieceId;
        team.markModified('jigsawState');

        let correctCount = 0;
        team.jigsawState.forEach((piece, i) => {
          if (piece === i) correctCount++;
        });
        team.scores.jigsaw = correctCount;

        if (correctCount === 36 && !team.completed) {
          team.completed = true;
          team.endTime = new Date();
          
          // Final Score calculation: sum of all moves/clicks + time in seconds
          const timeInSecs = Math.floor((team.endTime - team.startTime) / 1000);
          team.totalScore += team.jigsawClicks + timeInSecs;
        }

        await team.save();
        io.to(teamCode).emit('team_update', team);
        io.to('admin_room').emit('admin_update');
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('initiate_fusion', async ({ teamCode }) => {
    try {
      const team = await Team.findOne({ code: teamCode });
      if (team && !team.jigsawInitiated) {
        team.jigsawInitiated = true;
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
