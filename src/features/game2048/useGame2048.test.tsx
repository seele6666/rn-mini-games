import { act, renderHook, waitFor } from '@testing-library/react-native';
import { GameState } from './engine';
import { createSaveQueue, GameStorage } from './saveQueue';
import { useGame2048 } from './useGame2048';

const initial: GameState = {
  board: [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], score: 8, hasWon: false,
};
function memory(saved: GameState | null = initial): GameStorage {
  return { loadGame: async () => saved, saveGame: async (state) => { saved = state; } };
}

test('moves are blocked until the saved board has loaded', async () => {
  let release!: (state: GameState) => void;
  const pending = new Promise<GameState>((resolve) => { release = resolve; });
  const storage: GameStorage = { ...memory(), loadGame: () => pending };
  const { result } = await renderHook(() => useGame2048(storage, () => 0));
  await act(() => result.current.move('left'));
  expect(result.current.loading).toBe(true);
  expect(result.current.state).toBeNull();
  await act(() => release(initial));
  expect(result.current.state).toEqual(initial);
});

test('a missing save creates and persists a fresh zero-score game', async () => {
  const storage = createSaveQueue(memory(null));
  const { result } = await renderHook(() => useGame2048(storage, () => 0));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.state?.score).toBe(0);
  expect(await storage.loadGame()).toEqual(result.current.state);
});

test('rapid moves use the latest state and re-entry waits for the last saved move', async () => {
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  let saved: GameState | null = initial;
  let writes = 0;
  const storage = createSaveQueue({
    loadGame: async () => saved,
    saveGame: async (state) => { if (++writes === 1) await delayed; saved = state; },
  });
  const first = await renderHook(() => useGame2048(storage, () => 0));
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  await act(() => { first.result.current.move('left'); first.result.current.move('down'); });
  const latest = first.result.current.state;
  expect(latest?.board[3][0]).toBe(4);
  expect(latest?.score).toBe(12);
  await first.unmount();
  const next = await renderHook(() => useGame2048(storage, () => 0));
  expect(next.result.current.loading).toBe(true);
  await act(() => release());
  await waitFor(() => expect(next.result.current.loading).toBe(false));
  expect(next.result.current.state).toEqual(latest);
});

test('save failure keeps the board playable and the next move retries', async () => {
  let writes = 0;
  const storage = createSaveQueue({ ...memory(), saveGame: async () => {
    if (++writes === 1) throw new Error('full');
  } });
  const { result } = await renderHook(() => useGame2048(storage, () => 0));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.move('left'));
  await waitFor(() => expect(result.current.saveError).toBe(true));
  expect(result.current.state?.score).toBe(12);
  await act(() => result.current.move('down'));
  await waitFor(() => expect(result.current.saveError).toBe(false));
  expect(result.current.state?.board[3][0]).toBe(4);
});

test('victory pauses input until continue and is not repeated after restoring', async () => {
  const storage = createSaveQueue(memory({ ...initial, board: [[1024, 1024, 0, 0], ...initial.board.slice(1)] }));
  const first = await renderHook(() => useGame2048(storage, () => 0));
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  await act(() => first.result.current.move('left'));
  expect(first.result.current.winVisible).toBe(true);
  const won = first.result.current.state;
  await act(() => first.result.current.move('down'));
  expect(first.result.current.state).toBe(won);
  await act(() => first.result.current.continueAfterWin());
  expect(first.result.current.winVisible).toBe(false);
  await first.unmount();
  const next = await renderHook(() => useGame2048(storage, () => 0));
  await waitFor(() => expect(next.result.current.loading).toBe(false));
  expect(next.result.current.winVisible).toBe(false);
  expect(next.result.current.state?.hasWon).toBe(true);
});

test('restart resets score and victory and replaces the persistent game', async () => {
  const storage = createSaveQueue(memory({ ...initial, hasWon: true }));
  const { result } = await renderHook(() => useGame2048(storage, () => 0));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.restart());
  expect(result.current.state?.score).toBe(0);
  expect(result.current.state?.hasWon).toBe(false);
  expect(await storage.loadGame()).toEqual(result.current.state);
});
