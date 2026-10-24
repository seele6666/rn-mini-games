import { Platform, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { GestureDetector, NativeGesture } from 'react-native-gesture-handler';
import { Board, Direction } from '../../core/engine';
import { useBoardGesture } from './useBoardGesture';
import { styles, tileColors } from './GameBoard.styles';

export function GameBoard({ board, onMove, scrollGesture }: {
  board: Board; onMove: (direction: Direction) => void; scrollGesture?: NativeGesture;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 48, 420);
  const swipe = useBoardGesture(onMove, scrollGesture);
  return (
    <GestureDetector gesture={swipe} touchAction="none">
    <View accessibilityLabel="2048 棋盘" style={[styles.board, { width: size, height: size },
      Platform.OS === 'web' && ({ touchAction: 'none', userSelect: 'none' } as ViewStyle)]}>
      {board.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((value, c) => (
            <View key={c} accessible accessibilityLabel={`第${r + 1}行第${c + 1}列：${value || '空'}`}
              style={[styles.tile, { backgroundColor: tileColors[value] ?? '#3C3A32' }]}>
              {value > 0 && <Text numberOfLines={1} adjustsFontSizeToFit
                style={[styles.number, { color: value < 8 ? '#776E65' : '#FFFFFF',
                  fontSize: Math.min(size / (value >= 1024 ? 15 : 11), 34) }]}>{value}</Text>}
            </View>
          ))}
        </View>
      ))}
    </View>
    </GestureDetector>
  );
}
