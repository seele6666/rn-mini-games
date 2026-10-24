import { StyleSheet } from 'react-native';
import { colors } from '../../../../theme';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 468, alignSelf: 'center', padding: 24, paddingTop: 16 },
  back: { alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 24, marginBottom: 24 },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 52, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  score: { minWidth: 80, borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  scoreLabel: { color: '#CBD9CD', fontSize: 11 },
  scoreValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 4 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginVertical: 24 },
  goal: { fontSize: 12, color: colors.muted },
  help: { fontSize: 12, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: 20 },
  loading: { height: 280, alignItems: 'center', justifyContent: 'center' },
  rule: { padding: 20, backgroundColor: '#EDEEE6', borderRadius: 16, marginTop: 24 },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  ruleText: { fontSize: 12, lineHeight: 22, color: colors.muted, marginTop: 8 },
  saved: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 24 },
  error: { color: '#A3412D', fontSize: 12, lineHeight: 20, marginTop: 16 },
  endPanel: { alignItems: 'center', padding: 20, gap: 12, marginTop: 16, backgroundColor: colors.surface, borderRadius: 16 },
  endTitle: { fontSize: 20, color: colors.ink, fontWeight: '800' },
});
