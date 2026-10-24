import { act, render } from '@testing-library/react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { GameBoard } from './GameBoard';

const board = [[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
async function swipe(dx: number, dy: number, canceled = false) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('game2048-swipe'), [
      { state: State.BEGAN, absoluteX: 100, absoluteY: 100, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, absoluteX: 100 + dx / 2, absoluteY: 100 + dy / 2, translationX: 0, translationY: 0 },
      { state: canceled ? State.CANCELLED : State.END, absoluteX: 100 + dx, absoluteY: 100 + dy, translationX: dx / 2, translationY: dy / 2 },
    ]);
  });
}

test('the board exposes all 16 cells including empty cells', async () => {
  const screen = await render(<GestureHandlerRootView><GameBoard board={board} onMove={() => {}} /></GestureHandlerRootView>);
  expect(screen.getAllByLabelText(/^第\d行第\d列：/)).toHaveLength(16);
  expect(screen.getByLabelText('第1行第1列：2')).toBeTruthy();
});
test.each([
  [-80, 2, 'left'], [80, 2, 'right'], [2, -80, 'up'], [2, 80, 'down'],
])('a native swipe (%s, %s) produces one %s move', async (dx, dy, direction) => {
  const onMove = jest.fn();
  await render(<GestureHandlerRootView><GameBoard board={board} onMove={onMove} /></GestureHandlerRootView>);
  await swipe(Number(dx), Number(dy));
  expect(onMove.mock.calls).toEqual([[direction]]);
});

test('taps, short motions, ambiguous diagonals and canceled swipes do not move the board', async () => {
  const onMove = jest.fn();
  await render(<GestureHandlerRootView><GameBoard board={board} onMove={onMove} /></GestureHandlerRootView>);
  await swipe(0, 0);
  await swipe(10, 2);
  await swipe(60, 60);
  await swipe(0, 100, true);
  expect(onMove).not.toHaveBeenCalled();
});
