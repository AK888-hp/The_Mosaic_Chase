const validateHanoi = (moves) => {
  let pegs = [[1, 2, 3, 4, 5, 6], [], []];
  for (let move of moves) {
    const { from, to } = move;
    if (pegs[from].length === 0) return false;
    const disc = pegs[from][0];
    if (pegs[to].length > 0 && pegs[to][0] < disc) return false;
    pegs[from].shift();
    pegs[to].unshift(disc);
  }
  return pegs[2].length === 6 && pegs[2][0] === 1;
};

const moves = [];
function hanoi(n, source, auxiliary, target) {
  if (n === 1) {
    moves.push({ from: source, to: target });
    return;
  }
  hanoi(n - 1, source, target, auxiliary);
  moves.push({ from: source, to: target });
  hanoi(n - 1, auxiliary, source, target);
}

hanoi(6, 0, 1, 2);
console.log("Total moves:", moves.length);
console.log("Is valid:", validateHanoi(moves));
