import { Board, canMove, createGame, Direction, GameState, moveGame } from './engine';

const empty = (): Board => Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const game = (board: Board): GameState => ({ board, score: 0, hasWon: false });
const lastEmptyTwo = () => 0.89;

test('a new game starts with two distinct tiles and zero score', () => {
  const state = createGame(() => 0);
  expect(state).toEqual({
    board: [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    score: 0, hasWon: false,
  });
});

test('the top tenth of the tile random range generates 4', () => {
  const random = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.9)
    .mockReturnValueOnce(0).mockReturnValueOnce(0.89);
  expect(createGame(random).board[0]).toEqual([4, 2, 0, 0]);
});

test.each<{ direction: Direction; start: Board; end: Board }>([
  { direction: 'left', start: [[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    end: [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 2, 0]] },
  { direction: 'right', start: [[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    end: [[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 2, 0]] },
  { direction: 'up', start: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    end: [[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 2, 0]] },
  { direction: 'down', start: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    end: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 2, 2, 0]] },
])('slides $direction and adds exactly one new tile', ({ direction, start, end }) => {
  const state = game(start);
  expect(moveGame(state, direction, lastEmptyTwo).state.board).toEqual(end);
  expect(state.board).toEqual(start);
});

test('four equal tiles merge into two pairs and add eight points', () => {
  const board = empty(); board[0] = [2, 2, 2, 2];
  const state = game(board); state.score = 12;
  const result = moveGame(state, 'left', lastEmptyTwo);
  expect(result.state.board[0]).toEqual([4, 4, 0, 0]);
  expect(result.state.score).toBe(20);
  expect(state.board[0]).toEqual([2, 2, 2, 2]);
  expect(state.score).toBe(12);
});

test('a merged tile cannot merge again during the same move', () => {
  const board = empty(); board[0] = [2, 2, 4, 0];
  const result = moveGame(game(board), 'left', lastEmptyTwo);
  expect(result.state.board[0]).toEqual([4, 4, 0, 0]);
  expect(result.state.score).toBe(4);
});

test('an ineffective move preserves state and never consumes randomness', () => {
  const board = empty(); board[0][0] = 2;
  const state = game(board); const random = jest.fn();
  const result = moveGame(state, 'left', random);
  expect(result.moved).toBe(false);
  expect(result.state).toBe(state);
  expect(random).not.toHaveBeenCalled();
});

test('the first 2048 merge reports victory and records it for later moves', () => {
  const board = empty(); board[0] = [1024, 1024, 0, 0];
  const result = moveGame(game(board), 'left', lastEmptyTwo);
  expect(result.reached2048).toBe(true);
  expect(result.state.hasWon).toBe(true);
  const later = empty(); later[0] = [1024, 1024, 0, 0];
  expect(moveGame({ ...result.state, board: later }, 'left', lastEmptyTwo).reached2048).toBe(false);
});

test('a won game keeps merging toward 4096 and scoring normally', () => {
  const board = empty(); board[0] = [2048, 2048, 0, 0];
  const result = moveGame({ board, score: 100, hasWon: true }, 'left', lastEmptyTwo);
  expect(result.state.board[0][0]).toBe(4096);
  expect(result.state.score).toBe(4196);
  expect(result.reached2048).toBe(false);
  expect(result.gameOver).toBe(false);
});

const stuck: Board = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
test('a full board with no matching neighbours is over even after an invalid move', () => {
  expect(canMove(stuck)).toBe(false);
  expect(moveGame(game(stuck), 'left').gameOver).toBe(true);
});
test('a full board with a horizontal or vertical pair still has a move', () => {
  const horizontal = stuck.map((row) => [...row]); horizontal[0][1] = 2;
  const vertical = stuck.map((row) => [...row]); vertical[1][0] = 2;
  expect(canMove(horizontal)).toBe(true);
  expect(canMove(vertical)).toBe(true);
  expect(canMove(empty())).toBe(true);
});
test('game over is evaluated after the random tile fills the last empty space', () => {
  const board: Board = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [0, 4, 2, 8]];
  const result = moveGame(game(board), 'left', () => 0);
  expect(result.moved).toBe(true);
  expect(result.gameOver).toBe(true);
});
