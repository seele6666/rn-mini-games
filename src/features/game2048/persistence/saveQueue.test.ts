import { createSaveQueue } from './saveQueue';
import { GameState } from '../core/engine';

const first: GameState = {
  board: [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]], score: 0, hasWon: false,
};
const second: GameState = { ...first, score: 4 };

test('a slow earlier save cannot overwrite a later move', async () => {
  let release!: () => void;
  const delay = new Promise<void>((resolve) => { release = resolve; });
  let saved: GameState | null = null;
  let writes = 0;
  const queue = createSaveQueue({
    loadGame: async () => saved,
    saveGame: async (state) => { if (++writes === 1) await delay; saved = state; },
  });
  const one = queue.saveGame(first);
  const two = queue.saveGame(second);
  const reenter = queue.loadGame();
  await Promise.resolve();
  expect(writes).toBe(1);
  release(); await Promise.all([one, two]);
  expect(await reenter).toEqual(second);
});

test('a failed write reports failure and the next write can still succeed', async () => {
  let saved: GameState | null = null;
  let writes = 0;
  const queue = createSaveQueue({
    loadGame: async () => saved,
    saveGame: async (state) => { if (++writes === 1) throw new Error('full'); saved = state; },
  });
  await expect(queue.saveGame(first)).rejects.toThrow('full');
  await queue.saveGame(second);
  expect(await queue.loadGame()).toEqual(second);
});
