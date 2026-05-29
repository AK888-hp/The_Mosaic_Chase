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
  completed: { type: Boolean, default: false }
});

// Calculate total score dynamically (Lower is better)
teamSchema.virtual('totalScore').get(function() {
  let totalMoves = 0;
  ['tech', 'aptitude'].forEach(realm => {
    ['task1', 'task2', 'task3'].forEach(task => {
      totalMoves += this.scores[realm][task].points; // Points now store move count
    });
  });
  
  let timeInSeconds = 0;
  if (this.startTime) {
    const end = this.endTime || new Date();
    timeInSeconds = Math.floor((end - this.startTime) / 1000);
  }
  
  // Total Score: Total Moves + Time elapsed. (Lower is better)
  return totalMoves + timeInSeconds;
});

teamSchema.set('toJSON', { virtuals: true });
teamSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Team', teamSchema);
