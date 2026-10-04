import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from './engine';
export const SAVE_KEY = 'game2048.save.v1';
export type StorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<GameState>;
  return Array.isArray(state.board) && state.board.length === 4
    && state.board.every((row) => Array.isArray(row) && row.length === 4
      && row.every((cell) => Number.isSafeInteger(cell)
        && (cell === 0 || (cell >= 2 && Number.isInteger(Math.log2(cell))))))
    && Number.isSafeInteger(state.score) && (state.score as number) >= 0
    && typeof state.hasWon === 'boolean';
}

export function createGameStorage(adapter: StorageAdapter) {
  return {
    async loadGame(): Promise<GameState | null> {
      try {
        const raw = await adapter.getItem(SAVE_KEY);
        if (raw === null) return null;
        const data = JSON.parse(raw);
        return data?.version === 1 && isGameState(data.state) ? data.state : null;
      } catch { return null; }
    },
    async saveGame(state: GameState): Promise<void> {
      await adapter.setItem(SAVE_KEY, JSON.stringify({ version: 1, state }));
    },
  };
}

export const { loadGame, saveGame } = createGameStorage(AsyncStorage);
