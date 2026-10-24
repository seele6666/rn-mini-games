import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { createDeck, sortCards } from './cards';
import { CardFace, cardName } from './Hand';
import { ComboKind, PlayerObservation } from './types';

const deck = new Map(createDeck().map(card=>[card.id,card]));
const names:Record<ComboKind,string>={single:'单张',pair:'对子',triple:'三张',tripleSingle:'三带一',triplePair:'三带二',straight:'顺子',pairStraight:'连对',airplane:'飞机',airplaneSingle:'飞机带单',airplanePair:'飞机带对',fourSingle:'四带二',fourPair:'四带两对',bomb:'炸弹',rocket:'王炸'};
export function getRecentPlays(state:Pick<PlayerObservation,'history'|'target'|'targetCards'>) {
  return state.history.filter(entry=>entry.action.type==='play').slice(-3).map((entry,index,entries)=>({
    revision:entry.action.revision,seat:entry.action.seat,
    name:entry.combo?names[entry.combo.kind]:'出牌',
    cards:sortCards((entry.action.cardIds??[]).flatMap(id=>deck.has(id)?[{...deck.get(id)!}]:[])).reverse(),
    waiting:!!state.target&&index===entries.length-1,
  }));
}
export function RecentPlays({state}:{state:Pick<PlayerObservation,'history'|'target'|'targetCards'>}) {
  const plays=getRecentPlays(state);
  const slots=[...Array.from({length:3-plays.length},()=>null),...plays];
  return <View style={styles.row} accessibilityLabel="全桌最近三手">
    {slots.map((play,index)=><View key={play?`${play.revision}`:`empty-${index}`} style={[styles.panel,play?.waiting&&styles.waiting]}>
      {play?<>
        <Text style={styles.label} numberOfLines={1}>{play.seat===0?'你':`电脑${play.seat}`} · {play.name}</Text>
        <ScrollView horizontal style={styles.scroll} contentContainerStyle={styles.cards} accessibilityLabel={play.waiting?'当前待压的牌':`${play.seat===0?'你':`电脑${play.seat}`}的${play.name}，共${play.cards.length}张`}>
          {play.cards.map(card=><View key={card.id} testID="recent-play-card" accessible accessibilityLabel={cardName(card)}><CardFace card={card} small/></View>)}
        </ScrollView>
        <View style={styles.tags}><Text style={styles.tag}>{index===2?'最新':'较早'}</Text>{play.waiting&&<Text style={styles.active}>待压</Text>}</View>
      </>:<Text style={styles.empty}>等待出牌</Text>}
    </View>)}
  </View>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',gap:5,flex:1,minHeight:82},
  panel:{flex:1,minWidth:0,padding:3,borderRadius:7,backgroundColor:'#EDF0E7',borderWidth:1,borderColor:'#DBE1D6'},
  waiting:{borderColor:'#A17F31'},label:{fontSize:10,fontWeight:'700',color:'#263B35',height:13},
  scroll:{height:48,flexGrow:0},cards:{gap:2},tags:{flexDirection:'row',justifyContent:'space-between',height:13},
  tag:{fontSize:9,color:'#677568'},active:{fontSize:9,fontWeight:'800',color:'#88651C'},empty:{fontSize:10,color:'#778276',textAlign:'center',marginTop:25},
});
