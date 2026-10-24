import { Direction } from '../../core/engine';
export function swipeDirection(dx: number, dy: number): Direction | null {
  const x = Math.abs(dx), y = Math.abs(dy);
  if (Math.max(x, y) < 24 || Math.max(x, y) < Math.min(x, y) * 1.2) return null;
  return x > y ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
