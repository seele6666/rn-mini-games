import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, useNativeGesture } from 'react-native-gesture-handler';
import { colors } from '../../../../theme';
import { GameStorage } from '../../persistence/saveQueue';
import { useGame2048 } from '../../session/useGame2048';
import { GameBoard } from '../board/GameBoard';
import { Button } from '../button/Button';
import { Dialog } from '../dialog/Dialog';
import { styles } from './GameScreen.styles';

export function GameScreen({ onBack, storage, random }: { onBack: () => void; storage?: GameStorage; random?: () => number }) {
  const game = useGame2048(storage, random);
  const scrollGesture = useNativeGesture({ testID: 'game2048-page-scroll', disableReanimated: true });
  const [confirmRestart, setConfirmRestart] = useState(false);
  return (
    <SafeAreaView style={styles.screen}>
      <GestureDetector gesture={scrollGesture}>
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
        ) : <GameBoard board={game.state.board} onMove={game.move} scrollGesture={scrollGesture} />}
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
      </GestureDetector>
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
