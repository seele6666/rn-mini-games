import { GameState } from './types';
import { loadGame, saveGame, LoadResult } from './storage';

export interface GameStorage {
  loadGame(): Promise<LoadResult>;
  saveGame(state: GameState): Promise<void>;
}
export function createSaveQueue(storage: GameStorage): GameStorage {
  let tail: Promise<void> = Promise.resolve();
  return {
    async loadGame() {
      await tail;
      return storage.loadGame();
    },
    saveGame(state) {
      // Capture immediately: callers cannot mutate a pending snapshot behind the queue.
      const snapshot: GameState = JSON.parse(JSON.stringify(state));
      const write = tail.then(() => storage.saveGame(snapshot));
      tail = write.catch(() => {});
      return write;
    },
  };
}
// Page remounts share both the write chain and the read barrier.
export const persistence = createSaveQueue({loadGame,saveGame});
