import { Card } from './types';
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let rank = 3; rank <= 15; rank++) for (const suit of ['clubs', 'diamonds', 'hearts', 'spades']) deck.push({ id: `${rank}-${suit}`, rank, suit });
  return [...deck, { id: 'joker-small', rank: 16 }, { id: 'joker-big', rank: 17 }];
}
export function sortCards(cards: readonly Card[]): Card[] { return [...cards].sort((a,b) => a.rank - b.rank || a.id.localeCompare(b.id)); }
export function shuffleDeck(cards: readonly Card[], random: () => number = Math.random): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error('随机源必须返回0到1之间的数');
    const j = Math.floor(sample * (i + 1));
    [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}
export function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value,1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
