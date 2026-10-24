import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  board: { backgroundColor: '#B7ADA0', borderRadius: 16, padding: 8, gap: 8, alignSelf: 'center' },
  row: { flex: 1, flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  number: { fontWeight: '800', paddingHorizontal: 2 },
});

export const tileColors: Record<number, string> = {
  0: '#CCC2B5', 2: '#EEE4DA', 4: '#EDE0C8', 8: '#F2B179', 16: '#F59563',
  32: '#F67C5F', 64: '#F65E3B', 128: '#EDCF72', 256: '#EDCC61',
  512: '#EDC850', 1024: '#EDC53F', 2048: '#EDC22E',
};
