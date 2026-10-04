import { useRef } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { Board, Direction } from './engine';
import { swipeDirection } from './gesture';

const tileColors: Record<number, string> = {
  0: '#CCC2B5', 2: '#EEE4DA', 4: '#EDE0C8', 8: '#F2B179', 16: '#F59563',
  32: '#F67C5F', 64: '#F65E3B', 128: '#EDCF72', 256: '#EDCC61',
  512: '#EDC850', 1024: '#EDC53F', 2048: '#EDC22E',
};

export function GameBoard({ board, onMove }: { board: Board; onMove: (direction: Direction) => void }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 48, 420);
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <View accessibilityLabel="2048 棋盘" style={[styles.board, { width: size, height: size },
      Platform.OS === 'web' && ({ touchAction: 'none', userSelect: 'none' } as ViewStyle)]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={({ nativeEvent }) => {
        start.current = { x: nativeEvent.pageX, y: nativeEvent.pageY };
        // Fabric uses this return value to block the native parent ScrollView.
        return true;
      }}
      onResponderTerminationRequest={() => false}
      onResponderTerminate={() => { start.current = null; }}
      onResponderRelease={({ nativeEvent }) => {
        if (!start.current) return;
        const direction = swipeDirection(nativeEvent.pageX - start.current.x, nativeEvent.pageY - start.current.y);
        start.current = null;
        if (direction) onMove(direction);
      }}>
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
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#B7ADA0', borderRadius: 16, padding: 8, gap: 8, alignSelf: 'center' },
  row: { flex: 1, flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  number: { fontWeight: '800', paddingHorizontal: 2 },
});
