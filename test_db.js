const mongoose = require('mongoose');
const Team = require('./backend/models/Team');

const run = async () => {
  const team = new Team({ code: 'test_code' });
  console.log(team.scores);
  console.log(team.totalScore);
};

run();
