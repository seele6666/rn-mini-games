import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../../../theme';

export function Button({ title, onPress, secondary = false, disabled = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton,
      (pressed || disabled) && { opacity: 0.5 }]}>
    <Text style={[styles.buttonText, secondary && { color: colors.primary }]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#E7EBE2' },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
