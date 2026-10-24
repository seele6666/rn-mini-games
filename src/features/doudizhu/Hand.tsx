import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { sortCards } from './cards';
import { Card } from './types';

export interface HandProps {
  cards: readonly Card[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

const suits: Record<string, { name: string; mark: string }> = {
  clubs: { name: '梅花', mark: '♣' }, diamonds: { name: '方块', mark: '♦' },
  hearts: { name: '红桃', mark: '♥' }, spades: { name: '黑桃', mark: '♠' },
};
const rankName = (rank: number) => ({11:'J',12:'Q',13:'K',14:'A',15:'2',16:'小王',17:'大王'}[rank] ?? String(rank));
export function cardName(card: Card): string {
  return card.rank >= 16 ? rankName(card.rank) : `${suits[card.suit ?? '']?.name ?? ''} ${rankName(card.rank)}`;
}

export function CardFace({ card, small = false, compact = false }: { card: Card; small?: boolean;compact?:boolean }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds' || card.rank === 17;
  return <View pointerEvents="none" style={[styles.face, small && styles.smallFace,compact&&styles.compactFace]}>
    <Text style={[styles.rank, small && styles.smallRank,compact&&styles.compactRank, red && styles.red]}>{rankName(card.rank)}</Text>
    {card.rank < 16 && <Text style={[styles.suit,compact&&styles.compactSuit, red && styles.red]}>{suits[card.suit ?? '']?.mark}</Text>}
    {!small && <Text style={[styles.centerMark, red && styles.red]}>{card.rank >= 16 ? '王' : suits[card.suit ?? '']?.mark}</Text>}
  </View>;
}

export function Hand({ cards, selectedIds, onToggle, disabled = false }: HandProps) {
  const display = sortCards(cards).reverse();
  return <ScrollView horizontal accessibilityLabel="你的手牌" showsHorizontalScrollIndicator
    style={styles.scroll} contentContainerStyle={styles.cards}>
    {display.map((card,index) => {
      const selected = selectedIds.includes(card.id);
      return <HandCard key={card.id} card={card} selected={selected} disabled={disabled} last={index===display.length-1} onToggle={onToggle}/>;
    })}
  </ScrollView>;
}

function HandCard({card,selected,disabled,last,onToggle}:{card:Card;selected:boolean;disabled:boolean;last:boolean;onToggle:(id:string)=>void}) {
  const lift=useRef(new Animated.Value(selected?-10:0)).current;
  const [pressed,setPressed]=useState(false);
  useEffect(()=>{const animation=Animated.timing(lift,{toValue:selected?-10:0,duration:100,useNativeDriver:true});animation.start();return()=>animation.stop();},[selected,lift]);
  return <Pressable testID={`hand-card-${card.id}`} accessibilityRole="button" accessibilityLabel={cardName(card)} accessibilityState={{selected,disabled}}
    disabled={disabled} onPressIn={()=>!disabled&&setPressed(true)} onPressOut={()=>setPressed(false)} onPress={()=>onToggle(card.id)}
    style={[styles.slot,last&&styles.lastSlot,pressed&&styles.pressed]}>
    <Animated.View style={[styles.cardBorder,selected&&styles.selectedBorder,{transform:[{translateY:lift},{scale:pressed?0.97:1}]}]}><CardFace card={card}/></Animated.View>
  </Pressable>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0, height: 116 },
  cards: { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 6, alignItems: 'flex-start' },
  slot: { width: 48, height: 92 }, lastSlot: { width: 64 },
  pressed: { opacity: .72 },
  cardBorder: { width: 64, borderRadius: 9, borderWidth: 2, borderColor: 'transparent' },
  selectedBorder: { borderColor: '#D8AC49' },
  face: { width: 60, height: 86, borderRadius: 7, backgroundColor: '#FFFDF8', padding: 5,
    borderWidth: 1, borderColor: '#DBD8CB', overflow: 'hidden' },
  smallFace: { width: 36, height: 48, padding: 3 },
  compactFace:{width:22,height:30,padding:2},compactRank:{fontSize:9},compactSuit:{fontSize:8,lineHeight:10},
  rank: { fontSize: 19, fontWeight: '800', color: '#263B35' }, smallRank: { fontSize: 12 },
  suit: { fontSize: 14, color: '#263B35', lineHeight: 17 },
  red: { color: '#B6433A' },
  centerMark: { position: 'absolute', right: 5, bottom: 5, fontSize: 22, color: '#263B35', opacity: .75 },
});
