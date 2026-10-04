import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { GameStorage } from './saveQueue';
import { useGame2048 } from './useGame2048';
import { GameBoard } from './GameBoard';

function Button({ title, onPress, secondary = false, disabled = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton,
      (pressed || disabled) && { opacity: 0.5 }]}>
    <Text style={[styles.buttonText, secondary && { color: colors.primary }]}>{title}</Text>
  </Pressable>;
}

function Dialog({ title, message, children, onClose }: {
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

export function GameScreen({ onBack, storage, random }: { onBack: () => void; storage?: GameStorage; random?: () => number }) {
  const game = useGame2048(storage, random);
  const [confirmRestart, setConfirmRestart] = useState(false);
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回小游戏首页" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>←  小游戏合集</Text>
        </Pressable>
        <View style={styles.heading}>
          <View><Text style={styles.title}>2048</Text><Text style={styles.subtitle}>每一次合并，都再近一步。</Text></View>
          <View style={styles.score} accessible accessibilityLabel={`当前分数 ${game.state?.score ?? 0}`}>
            <Text style={styles.scoreLabel}>分数</Text><Text style={styles.scoreValue}>{game.state?.score ?? 0}</Text>
          </View>
        </View>
        <View style={styles.toolbar}>
          <Text style={styles.goal}>{game.state?.hasWon ? '已达成 2048 · 继续挑战' : '目标 2048'}</Text>
          <Button title="重新开始" onPress={() => setConfirmRestart(true)} secondary disabled={game.loading} />
        </View>
        {game.loading || !game.state ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.help}>正在读取进度…</Text></View>
        ) : <GameBoard board={game.state.board} onMove={game.move} />}
        {game.saveError && <Text accessibilityRole="alert" style={styles.error}>进度保存失败，当前棋盘仍可继续玩。下次移动会重试保存。</Text>}
        {game.gameOver && <View style={styles.endPanel}>
          <Text style={styles.endTitle}>本局结束</Text>
          <Text style={styles.help}>没有可以移动的方块了。再试一局吧。</Text>
          <Button title="再玩一局" onPress={() => setConfirmRestart(true)} />
        </View>}
        <Text style={styles.help}>上下左右滑动，相同数字合成更大的数字。</Text>
        <View style={styles.rule}><Text style={styles.ruleTitle}>慢慢想，慢慢玩</Text>
          <Text style={styles.ruleText}>每次有效移动会出现一个新方块。合成 2048 后，你还可以继续挑战更高的数字。</Text>
        </View>
        <Text style={styles.saved}>进度自动保存在这台设备上</Text>
      </ScrollView>
      {game.winVisible && <Dialog title="你合成了 2048！" message="做得不错。这局还可以继续，看看下一个目标 4096。" onClose={game.continueAfterWin}>
        <Button title="继续挑战" onPress={game.continueAfterWin} />
      </Dialog>}
      {confirmRestart && <Dialog title="重新开始这一局？" message="当前棋盘和分数将被新的游戏替换。" onClose={() => setConfirmRestart(false)}>
        <Button title="取消" secondary onPress={() => setConfirmRestart(false)} />
        <Button title="确认重新开始" onPress={() => { setConfirmRestart(false); game.restart(); }} />
      </Dialog>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  button: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#E7EBE2' },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  help: { fontSize: 12, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: 20 },
  loading: { height: 280, alignItems: 'center', justifyContent: 'center' },
  rule: { padding: 20, backgroundColor: '#EDEEE6', borderRadius: 16, marginTop: 24 },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  ruleText: { fontSize: 12, lineHeight: 22, color: colors.muted, marginTop: 8 },
  saved: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 24 },
  error: { color: '#A3412D', fontSize: 12, lineHeight: 20, marginTop: 16 },
  endPanel: { alignItems: 'center', padding: 20, gap: 12, marginTop: 16, backgroundColor: colors.surface, borderRadius: 16 },
  endTitle: { fontSize: 20, color: colors.ink, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(25,35,28,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, alignSelf: 'center', padding: 28, borderRadius: 24, backgroundColor: colors.background },
  dialogTitle: { fontSize: 24, color: colors.ink, fontWeight: '800' },
  dialogMessage: { color: colors.muted, fontSize: 14, lineHeight: 24, marginTop: 16 },
  dialogButtons: { gap: 12, marginTop: 24 },
});
