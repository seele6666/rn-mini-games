import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { GameScreen } from './GameScreen';
import { GameState } from './engine';
import { createSaveQueue } from './saveQueue';

const initial: GameState = {
  board: [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], score: 100, hasWon: false,
};
function memory(state: GameState) {
  return createSaveQueue({ loadGame: async () => state, saveGame: async (next) => { state = next; } });
}

test('restart requires confirmation; cancel preserves the current score and board', async () => {
  const storage = memory(initial);
  const screen = await render(<GameScreen onBack={() => {}} storage={storage} random={() => 0} />);
  await waitFor(() => screen.getByLabelText('当前分数 100'));
  await fireEvent.press(screen.getByRole('button', { name: '重新开始' }));
  await fireEvent.press(screen.getByRole('button', { name: '取消' }));
  expect(screen.getByLabelText('当前分数 100')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新开始' }));
  await fireEvent.press(screen.getByRole('button', { name: '确认重新开始' }));
  await waitFor(() => screen.getByLabelText('当前分数 0'));
  expect((await storage.loadGame())?.score).toBe(0);
});
test('a restored terminal board displays game over and can return to the catalog', async () => {
  const onBack = jest.fn();
  const storage = memory({ ...initial, board: [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]] });
  const screen = await render(<GameScreen onBack={onBack} storage={storage} />);
  await waitFor(() => screen.getByText('本局结束'));
  await fireEvent.press(screen.getByRole('button', { name: '返回小游戏首页' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});
