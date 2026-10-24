import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../../theme';

export function Dialog({ title, message, children, onClose }: {
  title: string; message: string; children: React.ReactNode; onClose: () => void;
}) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}>
      <Text style={styles.dialogTitle}>{title}</Text>
      <Text style={styles.dialogMessage}>{message}</Text>
      <View style={styles.dialogButtons}>{children}</View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(25,35,28,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, alignSelf: 'center', padding: 28, borderRadius: 24, backgroundColor: colors.background },
  dialogTitle: { fontSize: 24, color: colors.ink, fontWeight: '800' },
  dialogMessage: { color: colors.muted, fontSize: 14, lineHeight: 24, marginTop: 16 },
  dialogButtons: { gap: 12, marginTop: 24 },
});
