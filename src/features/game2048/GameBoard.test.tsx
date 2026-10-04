import { fireEvent, render } from '@testing-library/react-native';
import { GameBoard } from './GameBoard';

const board = [[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
const touch = (pageX: number, pageY: number) => ({ nativeEvent: {
  pageX, pageY, locationX: pageX, locationY: pageY, identifier: 1,
  timestamp: 0, target: 1, touches: [], changedTouches: [],
} });

test('the board exposes all 16 cells including empty cells', async () => {
  const screen = await render(<GameBoard board={board} onMove={() => {}} />);
  expect(screen.getAllByLabelText(/^第\d行第\d列：/)).toHaveLength(16);
  expect(screen.getByLabelText('第1行第1列：2')).toBeTruthy();
});
test('a touch produces one direction on release and ignores taps', async () => {
  const onMove = jest.fn();
  const screen = await render(<GameBoard board={board} onMove={onMove} />);
  const area = screen.getByLabelText('2048 棋盘');
  await fireEvent(area, 'responderGrant', touch(100, 100));
  await fireEvent(area, 'responderRelease', touch(50, 105));
  await fireEvent(area, 'responderRelease', touch(40, 105));
  expect(onMove.mock.calls).toEqual([['left']]);
  await fireEvent(area, 'responderGrant', touch(100, 100));
  await fireEvent(area, 'responderRelease', touch(105, 105));
  expect(onMove).toHaveBeenCalledTimes(1);
});

test('claiming a board touch blocks native scrolling from stealing vertical swipes', async () => {
  const screen = await render(<GameBoard board={board} onMove={() => {}} />);
  const area = screen.getByLabelText('2048 棋盘');
  expect(area.props.onResponderGrant(touch(100, 100))).toBe(true);
});
