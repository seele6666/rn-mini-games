import { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { CardFace, cardName, Hand } from './Hand';
import { Action, Difficulty, PlayerObservation, Seat } from './types';
import { SessionOptions, useDoudizhu } from './useDoudizhu';
import { RecentPlays } from './RecentPlays';
import { useDoudizhuMedia } from './useDoudizhuMedia';
export interface GameScreenProps {onBack:()=>void;focused?:boolean;sessionOptions?:Omit<SessionOptions,'focused'>}

const difficulties:Record<Difficulty,string>={easy:'简单',normal:'普通',hard:'困难',expert:'非常困难'};
const seatName=(seat:Seat)=>seat===0?'你':`电脑${seat}`;
const actionNames:Record<Action['type'],string>={call:'叫地主',declineCall:'不叫',grab:'抢地主',declineGrab:'不抢',play:'出牌',pass:'不出'};
function role(state:PlayerObservation,seat:Seat) {return state.landlord===null?'待定':state.landlord===seat?'地主':'农民';}
function recent(state:PlayerObservation,seat:Seat) {
  const entry=[...state.history].reverse().find(item=>item.action.seat===seat);
  if (!entry) return '尚未行动';
  return `${actionNames[entry.action.type]}${entry.action.cardIds ? ` · ${entry.action.cardIds.length}张` : ''}`;
}
function Button({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}) {
  const [pressed,setPressed]=useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} disabled={disabled}
    onPress={onPress} onPressIn={()=>!disabled&&setPressed(true)} onPressOut={()=>setPressed(false)}
    style={[styles.button,secondary&&styles.secondary,disabled&&styles.dim,pressed&&styles.pressed]}>
    <Text style={[styles.buttonText,secondary&&styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export function GameScreen({onBack,focused=true,sessionOptions}:GameScreenProps) {
  const [settingsVisible,setSettingsVisible]=useState(false);
  const game=useDoudizhu({...sessionOptions,focused:focused&&!settingsVisible});
  const media=useDoudizhuMedia({focused});
  const confirm=(run:()=>void)=>()=>{media.feedback('confirm');run();};
  const submit=(type:Action['type'])=>()=>media.feedback(game.submit(type)?'confirm':'error');
  const state=game.state;
  const activeGame=!!state&&!game.choosingDifficulty&&!game.loading;
  return <SafeAreaView style={styles.screen}>
    <View style={styles.top}>
      <Button title="返回小游戏首页" onPress={confirm(onBack)} secondary />
      <Text style={styles.title}>斗地主</Text>
      <View style={styles.topRight}>
        {game.difficulty&&<Text style={styles.caption}>难度：{difficulties[game.difficulty]}</Text>}
        <Button title="设置" onPress={confirm(()=>setSettingsVisible(true))} secondary/>
        {activeGame&&state.phase!=='finished'&&<Button title="重新开始" onPress={confirm(game.requestRestart)} secondary />}
      </View>
    </View>
    {game.loading ? <View style={styles.empty}><ActivityIndicator color={colors.primary}/><Text style={styles.ink}>正在恢复对局…</Text></View>
      : game.choosingDifficulty ? <View style={styles.empty}>
        <Text style={styles.heading}>选择新局难度</Text>
        {game.restoreIssue&&<Text accessibilityRole="alert" style={styles.restoreError}>{game.restoreIssue==='invalid'
          ?'存档损坏或版本不支持，无法恢复。请选择新局难度。':'暂时无法读取存档。你可以选择难度开始新局。'}</Text>}
        <View style={styles.choices}>{(['easy','normal','hard','expert'] as Difficulty[]).map(value=><Button key={value} title={difficulties[value]} onPress={confirm(()=>game.startNewGame(value))}/>)}</View>
        {!!game.message&&<Text accessibilityRole="alert" style={styles.error}>{game.message}</Text>}
      </View> : state&&<View style={styles.table}>
        <View style={styles.opponents}>
          <View style={styles.opponent}><Text style={styles.ink}>电脑2 · {role(state,2)} · {state.remainingCounts[2]}张</Text><Text style={styles.caption}>{recent(state,2)}</Text></View>
          <View style={styles.bottom} accessible accessibilityLabel={state.publicBottomCards.length?'公开底牌：'+state.publicBottomCards.map(cardName).join('、'):'底牌尚未公开，共3张'}>
            <Text style={styles.caption}>底牌</Text>
            {state.publicBottomCards.length ? state.publicBottomCards.map(card=><CardFace key={card.id} card={card} small compact/>)
              : [0,1,2].map(index=><View key={index} style={styles.cardBack}><Text style={styles.cardBackMark}>♠</Text></View>)}
          </View>
          <View style={[styles.opponent,styles.right]}><Text style={styles.ink}>电脑1 · {role(state,1)} · {state.remainingCounts[1]}张</Text><Text style={styles.caption}>{recent(state,1)}</Text></View>
        </View>
        <View style={styles.center}>
          <View style={styles.status}>
            <Text style={styles.turn}>{state.phase==='finished'&&state.winner
              ?`${state.winner.humanWon?'你赢了':'你输了'} · ${state.winner.team==='landlord'?'地主':'农民'}获胜`
              : game.thinking?`${seatName(state.currentSeat)}正在思考…`:state.currentSeat===0?'轮到你了':`轮到${seatName(state.currentSeat)}`}</Text>
            <Text style={styles.caption}>你 · {role(state,0)} · {state.hand.length}张 · {recent(state,0)}</Text>
            {game.suggestedPass&&<Text style={styles.caption}>建议不出，请确认。</Text>}
            {!!game.message&&<Text accessibilityRole="alert" style={styles.error} numberOfLines={2}>{game.message}</Text>}
            {game.saveError&&<Text accessibilityRole="alert" style={styles.error} numberOfLines={2}>进度尚未保存；当前对局可继续，后续操作会重试。</Text>}
          </View>
          <RecentPlays state={state}/>
        </View>
        <View style={styles.actions}>
          {state.phase==='calling'&&<><Button title="叫地主" disabled={!game.permissions.humanTurn} onPress={submit('call')}/><Button title="不叫" secondary disabled={!game.permissions.humanTurn} onPress={submit('declineCall')}/></>}
          {state.phase==='grabbing'&&<><Button title="抢地主" disabled={!game.permissions.humanTurn} onPress={submit('grab')}/><Button title="不抢" secondary disabled={!game.permissions.humanTurn} onPress={submit('declineGrab')}/></>}
          {state.phase==='playing'&&<><Button title="出牌" disabled={!game.permissions.humanTurn} onPress={submit('play')}/><Button title="不出" secondary disabled={!game.permissions.canPass} onPress={submit('pass')}/><Button title={game.hinting?'提示中…':'提示'} secondary disabled={!game.permissions.canHint} onPress={confirm(game.requestHint)}/></>}
          {state.phase==='finished'&&<Button title="再来一局" onPress={confirm(game.requestRestart)}/>}
        </View>
        <Hand cards={state.hand} selectedIds={game.selectedIds} onToggle={id=>{if(game.toggleCard(id))media.feedback('selection');}} disabled={!game.permissions.humanTurn||state.phase!=='playing'}/>
      </View>}
    {game.confirmRestartVisible&&<Modal transparent animationType="fade" onRequestClose={game.cancelRestart}>
      <View style={styles.overlay}><View style={styles.dialog} accessibilityViewIsModal>
        <Text style={styles.heading}>重新开始这一局？</Text><Text style={styles.dialogText}>确认后选择难度，开始新的对局。</Text>
        <View style={styles.choices}><Button title="取消" secondary onPress={confirm(game.cancelRestart)}/><Button title="确认重新开始" onPress={confirm(game.confirmRestart)}/></View>
      </View></View>
    </Modal>}
    {settingsVisible&&<Modal transparent animationType="fade" onRequestClose={()=>setSettingsVisible(false)}>
      <View style={styles.overlay}><View style={[styles.dialog,styles.settingsDialog]} accessibilityViewIsModal>
        <Text style={styles.heading}>音乐与反馈</Text>
        <View style={styles.settingRow}><Text style={styles.ink}>背景音乐</Text><Pressable accessibilityRole="switch" accessibilityLabel="背景音乐" accessibilityState={{checked:media.settings.musicEnabled,disabled:!media.loaded}} disabled={!media.loaded} onPress={confirm(()=>media.updateSettings({musicEnabled:!media.settings.musicEnabled}))} style={({pressed})=>[styles.settingSwitch,pressed&&styles.pressed]}><Text>{media.settings.musicEnabled?'开启':'关闭'}</Text></Pressable></View>
        <View style={styles.settingRow}><Text style={styles.ink}>音量 {Math.round(media.settings.volume*100)}%</Text><View style={styles.choices}><Button title="减小音乐音量" secondary disabled={!media.loaded||media.settings.volume<=0} onPress={confirm(()=>media.updateSettings({volume:Math.max(0,media.settings.volume-.25)}))}/><Button title="增大音乐音量" secondary disabled={!media.loaded||media.settings.volume>=1} onPress={confirm(()=>media.updateSettings({volume:Math.min(1,media.settings.volume+.25)}))}/></View></View>
        <View style={styles.settingRow}><Text style={styles.ink}>轻震动</Text><Pressable accessibilityRole="switch" accessibilityLabel="轻震动" accessibilityState={{checked:media.settings.hapticsEnabled,disabled:!media.loaded}} disabled={!media.loaded} onPress={confirm(()=>media.updateSettings({hapticsEnabled:!media.settings.hapticsEnabled}))} style={({pressed})=>[styles.settingSwitch,pressed&&styles.pressed]}><Text>{media.settings.hapticsEnabled?'开启':'关闭'}</Text></Pressable></View>
        {media.saveError&&<Text accessibilityRole="alert" style={styles.error}>设置尚未保存，请再次调整重试。</Text>}
        {media.musicError&&<><Text accessibilityRole="alert" style={styles.error}>音乐播放失败，可重新开启。</Text><Button title="重试音乐" onPress={confirm(media.retryMusic)}/></>}
        <Text style={styles.credit}>Monkeys Spinning Monkeys · Kevin MacLeod{ '\n' }CC BY 4.0 · incompetech.com</Text>
        <View style={styles.choices}><Button title="配乐来源与许可" secondary onPress={confirm(()=>{void Linking.openURL('https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400011').catch(()=>{});})}/><Button title="查看 CC BY 4.0 许可" secondary onPress={confirm(()=>{void Linking.openURL('https://creativecommons.org/licenses/by/4.0/').catch(()=>{});})}/><Button title="关闭设置" onPress={confirm(()=>setSettingsVisible(false))}/></View>
      </View></View>
    </Modal>}
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background,paddingHorizontal:8,paddingVertical:2},
  top:{height:30,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  topRight:{flexDirection:'row',alignItems:'center',gap:8},
  title:{fontSize:18,fontWeight:'800',color:colors.primary},
  table:{flex:1,gap:2},
  opponents:{height:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  opponent:{flex:1,gap:4},right:{alignItems:'flex-end'},
  bottom:{flexDirection:'row',alignItems:'center',gap:4},
  cardBack:{width:22,height:30,backgroundColor:colors.primary,borderRadius:5,borderWidth:2,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  cardBackMark:{color:'#D2DFD4',fontSize:22},
  center:{flex:1,minHeight:82,flexDirection:'row',alignItems:'center',gap:6},
  status:{width:126,gap:2},turn:{fontSize:14,fontWeight:'800',color:colors.primary},
  target:{flex:1,height:48},targetCards:{gap:3,alignItems:'center'},
  lead:{flex:1,fontSize:12,textAlign:'center',color:colors.muted},
  actions:{height:32,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10},
  button:{minHeight:30,paddingHorizontal:14,paddingVertical:6,borderRadius:8,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  secondary:{backgroundColor:'#E7EBE2'},buttonText:{fontSize:12,fontWeight:'700',color:'#FFFFFF'},secondaryText:{color:colors.primary},dim:{opacity:.45},
  pressed:{opacity:.72,backgroundColor:'#47685C',transform:[{scale:.96}]},
  caption:{fontSize:11,color:colors.muted},ink:{fontSize:12,color:colors.ink},
  error:{fontSize:10,lineHeight:13,color:'#A3412D'},
  empty:{flex:1,alignItems:'center',justifyContent:'center',gap:14,paddingHorizontal:12},
  heading:{fontSize:20,fontWeight:'800',color:colors.ink},choices:{flexDirection:'row',justifyContent:'center',gap:12},
  restoreError:{color:'#A3412D',fontSize:13,textAlign:'center'},
  overlay:{flex:1,backgroundColor:'rgba(25,35,28,0.45)',justifyContent:'center',alignItems:'center',padding:16},
  dialog:{width:'100%',maxWidth:420,borderRadius:18,padding:22,backgroundColor:colors.background,gap:18},
  dialogText:{color:colors.muted,fontSize:13},
  settingsDialog:{maxWidth:580,gap:10,padding:16},settingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  settingSwitch:{minWidth:60,minHeight:30,padding:6,alignItems:'center',backgroundColor:'#E7EBE2',borderRadius:8},
  credit:{fontSize:10,color:colors.muted,lineHeight:13},
});
