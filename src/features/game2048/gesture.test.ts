import { swipeDirection } from './gesture';

test.each([
  [40, 8, 'right'], [-40, 8, 'left'], [5, -40, 'up'], [5, 40, 'down'],
  [0, 0, null], [10, -10, null], [30, 30, null],
])('classifies a clear swipe (%s, %s) as %s', (dx, dy, expected) => {
  expect(swipeDirection(dx as number, dy as number)).toBe(expected);
});
