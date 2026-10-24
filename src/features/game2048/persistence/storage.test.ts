import { createGameStorage, SAVE_KEY, StorageAdapter } from './storage';
import { GameState } from '../core/engine';

const state: GameState = {
  board: [[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  score: 16, hasWon: false,
};
function memory(initial: string | null = null): StorageAdapter {
  const values = new Map<string, string>();
  if (initial !== null) values.set(SAVE_KEY, initial);
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  };
}

test('a saved board, score and victory flag round trip together', async () => {
  const storage = createGameStorage(memory());
  await storage.saveGame({ ...state, hasWon: true });
  expect(await storage.loadGame()).toEqual({ ...state, hasWon: true });
});
test('a missing save starts a fresh session', async () => {
  expect(await createGameStorage(memory()).loadGame()).toBeNull();
});
test.each([
  '{bad json', 'null', JSON.stringify({ version: 0, state }),
  JSON.stringify({ version: 2, state }),
  JSON.stringify({ version: 1, state: { ...state, board: [[2]] } }),
  JSON.stringify({ version: 1, state: { ...state, board: [[3, 0, 0, 0], ...state.board.slice(1)] } }),
  JSON.stringify({ version: 1, state: { ...state, board: [[1, 0, 0, 0], ...state.board.slice(1)] } }),
  JSON.stringify({ version: 1, state: { ...state, score: -1 } }),
  JSON.stringify({ version: 1, state: { ...state, score: 0.5 } }),
  JSON.stringify({ version: 1, state: { ...state, hasWon: 'false' } }),
])('rejects a malformed or unsupported save: %s', async (raw) => {
  expect(await createGameStorage(memory(raw)).loadGame()).toBeNull();
});
test('read failure safely returns no saved game', async () => {
  const storage = createGameStorage({ ...memory(), getItem: async () => { throw new Error('disk'); } });
  expect(await storage.loadGame()).toBeNull();
});
test('write failure reaches the caller for visible feedback', async () => {
  const storage = createGameStorage({ ...memory(), setItem: async () => { throw new Error('full'); } });
  await expect(storage.saveGame(state)).rejects.toThrow('full');
});
test('a new game replaces the old game in the same save slot', async () => {
  const storage = createGameStorage(memory());
  await storage.saveGame({ ...state, score: 2048, hasWon: true });
  await storage.saveGame(state);
  expect(await storage.loadGame()).toEqual(state);
});
