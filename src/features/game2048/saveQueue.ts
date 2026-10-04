import { GameState } from './engine';
export type GameStorage = {
  loadGame(): Promise<GameState | null>;
  saveGame(state: GameState): Promise<void>;
};
export function createSaveQueue(storage: GameStorage): GameStorage {
  let tail: Promise<void> = Promise.resolve();
  return {
    async loadGame() {
      await tail;
      return storage.loadGame();
    },
    saveGame(state) {
      const write = tail.then(() => storage.saveGame(state));
      // Recover the queue, while the returned promise still reports this failure.
      tail = write.catch(() => {});
      return write;
    },
  };
}
