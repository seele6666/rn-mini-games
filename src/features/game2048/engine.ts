export type Direction = 'up' | 'down' | 'left' | 'right';
export type Board = number[][];
export type GameState = { board: Board; score: number; hasWon: boolean };
export type MoveResult = { state: GameState; moved: boolean; reached2048: boolean; gameOver: boolean };

function spawn(board: Board, random: () => number) {
  const empty: [number, number][] = [];
  board.forEach((row, r) => row.forEach((value, c) => { if (value === 0) empty.push([r, c]); }));
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(random() * empty.length)];
  board[r][c] = random() < 0.9 ? 2 : 4;
}

export function createGame(random: () => number = Math.random): GameState {
  const board = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  spawn(board, random);
  spawn(board, random);
  return { board, score: 0, hasWon: false };
}

// Each line is read from the edge the tiles are moving toward.
function coordinates(direction: Direction, line: number, position: number): [number, number] {
  switch (direction) {
    case 'left': return [line, position];
    case 'right': return [line, 3 - position];
    case 'up': return [position, line];
    case 'down': return [3 - position, line];
  }
}

export function moveGame(state: GameState, direction: Direction, random: () => number = Math.random): MoveResult {
  const board = state.board.map((row) => [...row]);
  let score = state.score;
  for (let line = 0; line < 4; line++) {
    const values = Array.from({ length: 4 }, (_, i) => {
      const [r, c] = coordinates(direction, line, i);
      return state.board[r][c];
    }).filter((value) => value !== 0);
    const merged: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        merged.push(values[i] * 2);
        score += values[i] * 2;
        i++;
      } else merged.push(values[i]);
    }
    for (let i = 0; i < 4; i++) {
      const [r, c] = coordinates(direction, line, i);
      board[r][c] = merged[i] ?? 0;
    }
  }
  const moved = board.some((row, r) => row.some((value, c) => value !== state.board[r][c]));
  if (!moved) return { state, moved: false, reached2048: false, gameOver: !canMove(state.board) };
  const reached2048 = !state.hasWon && board.some((row) => row.some((value) => value >= 2048));
  spawn(board, random);
  return {
    state: { board, score, hasWon: state.hasWon || reached2048 },
    moved: true, reached2048, gameOver: !canMove(board),
  };
}

export function canMove(board: Board): boolean {
  return board.some((row, r) => row.some((value, c) =>
    value === 0 || (c < 3 && value === row[c + 1]) || (r < 3 && value === board[r + 1][c]),
  ));
}
