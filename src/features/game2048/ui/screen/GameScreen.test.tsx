import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { GameScreen } from './GameScreen';
import { GameState } from '../../core/engine';
import { createSaveQueue } from '../../persistence/saveQueue';

const initial: GameState = {
  board: [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], score: 100, hasWon: false,
};
function memory(state: GameState) {
  return createSaveQueue({ loadGame: async () => state, saveGame: async (next) => { state = next; } });
}

test('restart requires confirmation; cancel preserves the current score and board', async () => {
  const storage = memory(initial);
  const screen = await render(<GestureHandlerRootView><GameScreen onBack={() => {}} storage={storage} random={() => 0} /></GestureHandlerRootView>);
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
  const screen = await render(<GestureHandlerRootView><GameScreen onBack={onBack} storage={storage} /></GestureHandlerRootView>);
  await waitFor(() => screen.getByText('本局结束'));
  await fireEvent.press(screen.getByRole('button', { name: '返回小游戏首页' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('board swipes block the page scroll gesture at the native handler boundary', async () => {
  await render(<GestureHandlerRootView><GameScreen onBack={() => {}} storage={memory(initial)} /></GestureHandlerRootView>);
  await waitFor(() => getByGestureTestId('game2048-swipe'));
  const swipe = getByGestureTestId('game2048-swipe');
  const scroll = getByGestureTestId('game2048-page-scroll');
  if (!('gestureRelations' in swipe) || !('handlerTag' in scroll)) throw new Error('Expected native gesture handlers');
  expect(swipe.gestureRelations.blocksHandlers).toContain(scroll.handlerTag);
});

test('a fast native swipe merges and saves the board without waiting for a JS touch grant', async () => {
  const storage = memory(initial);
  const screen = await render(<GestureHandlerRootView><GameScreen onBack={() => {}} storage={storage} random={() => 0} /></GestureHandlerRootView>);
  await waitFor(() => screen.getByLabelText('当前分数 100'));
  await act(async () => {
    fireGestureHandler(getByGestureTestId('game2048-swipe'), [
      { state: State.BEGAN, absoluteX: 100, absoluteY: 100, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, absoluteX: 20, absoluteY: 102, translationX: 0, translationY: 0 },
      { state: State.END, absoluteX: 10, absoluteY: 102, translationX: -10, translationY: 0 },
    ]);
  });
  await waitFor(() => screen.getByLabelText('当前分数 104'));
  expect(screen.getByLabelText('第1行第1列：4')).toBeTruthy();
  expect((await storage.loadGame())?.board[0][0]).toBe(4);
});
