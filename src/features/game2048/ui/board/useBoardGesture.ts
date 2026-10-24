import { useRef } from 'react';
import { NativeGesture, usePanGesture } from 'react-native-gesture-handler';
import { Direction } from '../../core/engine';
import { swipeDirection } from './gesture';

// Owns native swipe coordination; direction calculation stays in gesture.ts.
export function useBoardGesture(onMove: (direction: Direction) => void, scrollGesture?: NativeGesture) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return usePanGesture({
    testID: 'game2048-swipe',
    minDistance: 1,
    maxPointers: 1,
    block: scrollGesture,
    disableReanimated: true,
    onBegin: (event) => {
      start.current = { x: event.absoluteX, y: event.absoluteY };
    },
    onDeactivate: (event) => {
      const origin = start.current;
      start.current = null;
      if (event.canceled || !origin) return;
      // Native Pan translation starts at activation, which can miss the first fast movement.
      const direction = swipeDirection(event.absoluteX - origin.x, event.absoluteY - origin.y);
      if (direction) onMove(direction);
    },
    onFinalize: () => { start.current = null; },
  });
}
