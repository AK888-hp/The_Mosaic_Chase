const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  players: {
    player1: { type: String, default: null }, // Tech Realm
    player2: { type: String, default: null }, // Aptitude Realm
  },
  scores: {
    tech: {
      task1: { completed: { type: Boolean, default: false }, points: { type: Number, default: 0 } },
      task2: { completed: { type: Boolean, default: false }, points: { type: Number, default: 0 } },
      task3: { completed: { type: Boolean, default: false }, points: { type: Number, default: 0 } }
    },
    aptitude: {
      task1: { completed: { type: Boolean, default: false }, points: { type: Number, default: 0 } },
      task2: { completed: { type: Boolean, default: false }, points: { type: Number, default: 0 } },
      task3: { completed: { type: Boolean, default: false }, points: { type: Number, default: 0 } }
    },
    jigsaw: { type: Number, default: 0 } // Pieces placed correctly (max 36)
  },
  pieces: {
    tech: { type: Number, default: 0 },
    aptitude: { type: Number, default: 0 }
  },
  jigsawState: { type: Array, default: [] }, // Array representing the 6x6 grid state
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  completed: { type: Boolean, default: false },
  totalScore: { type: Number, default: 0 },
  jigsawClicks: { type: Number, default: 0 }
});

module.exports = mongoose.model('Team', teamSchema);
