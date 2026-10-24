import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>给自己一点游戏时间</Text>
        <Text style={styles.title}>小游戏合集</Text>
        <Text style={styles.subtitle}>选一款游戏，轻松玩一会儿。</Text>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>你的游戏</Text>
          <Text style={styles.count}>02</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="开始玩 2048"
          onPress={() => router.push('/games/2048')}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
          <View style={styles.preview}>
            {[2, 4, 8, 2048].map((value, i) => (
              <View key={value} style={[styles.previewTile, { backgroundColor: ['#EEE4DA', '#EDE0C8', '#F2B179', '#EDC22E'][i] }]}>
                <Text style={[styles.previewNumber, value >= 8 && { color: '#FFFFFF' }, value === 2048 && { fontSize: 24 }]}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.tag}>数字 · 益智</Text>
            <Text style={styles.gameTitle}>2048</Text>
            <Text style={styles.description}>滑动、合并，看看你能走多远。</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.offline}>离线可玩 · 自动保存</Text>
              <Text style={styles.play}>开始玩  →</Text>
            </View>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="开始玩 斗地主"
          onPress={() => router.push('/games/doudizhu')}
          style={({ pressed }) => [styles.card, styles.pokerCard, pressed && { opacity: 0.8 }]}>
          <View style={styles.pokerPreview}>
            {['A','K','Q'].map((rank,index) => <View key={rank} style={[styles.pokerFace,{transform:[{rotate:`${(index-1)*10}deg`},{translateY:index===1?-7:0}]}]}>
              <Text style={[styles.pokerRank,index===1 && {color:'#B6433A'}]}>{rank}</Text>
              <Text style={[styles.pokerSuit,index===1 && {color:'#B6433A'}]}>{index===1?'♥':'♠'}</Text>
            </View>)}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.tag}>纸牌 · 策略</Text>
            <Text style={styles.gameTitle}>斗地主</Text>
            <Text style={styles.description}>叫地主、搭配出牌，与两位电脑过过招。</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.offline}>三档难度 · 离线存档</Text>
              <Text style={styles.play}>开始玩  →</Text>
            </View>
          </View>
        </Pressable>
        <Text style={styles.bottomNote}>不用赶时间，下一步慢慢想。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 42, maxWidth: 520, width: '100%', alignSelf: 'center' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '600', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 14 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 12, lineHeight: 24 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  count: { fontSize: 13, color: colors.muted },
  card: { borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  pokerCard: { marginTop: 20 },
  pokerPreview: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 30, marginBottom: 18, backgroundColor: '#285C46' },
  pokerFace: { width: 62, height: 86, padding: 8, borderRadius: 8, backgroundColor: '#FFFDF8', marginHorizontal: 3 },
  pokerRank: { fontSize: 24, fontWeight: '800', color: colors.ink },
  pokerSuit: { fontSize: 24, color: colors.ink, alignSelf: 'flex-end' },
  preview: { flexDirection: 'row', flexWrap: 'wrap', width: 200, gap: 8, margin: 28, alignSelf: 'center' },
  previewTile: { width: 96, height: 78, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewNumber: { color: '#776E65', fontWeight: '800', fontSize: 32 },
  cardBody: { padding: 24, paddingTop: 0 },
  tag: { fontSize: 12, color: colors.muted },
  gameTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  description: { color: colors.muted, fontSize: 14, marginTop: 8, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  offline: { fontSize: 11, color: colors.muted },
  play: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  bottomNote: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 32 },
});
