import { Card, Combo, Play } from './types';
import { sortCards } from './cards';
function groups(cards: readonly Card[]): Map<number, Card[]> {
  const result = new Map<number, Card[]>();
  for (const card of sortCards(cards)) result.set(card.rank, [...(result.get(card.rank) ?? []), card]);
  return result;
}
export function analyzeCards(cards: readonly Card[]): Combo[] {
  if (!cards.length || new Set(cards.map(c => c.id)).size !== cards.length) return [];
  const grouped = groups(cards), ranks = [...grouped.keys()], n = cards.length, result: Combo[] = [];
  if (ranks.some(r => !Number.isInteger(r) || r < 3 || r > 17 || grouped.get(r)!.length > (r >= 16 ? 1 : 4))) return [];
  const add = (kind: Combo['kind'], bodyRank: number, bodyLength = 1, wing: Combo['wing'] = 'none') => result.push({kind,bodyRank,bodyLength,wing});
  const consecutive = (rs: number[]) => rs.every((r,i) => r <= 14 && (!i || r === rs[i-1]+1));
  if (n === 1) add('single',ranks[0]);
  if (n === 2 && ranks.length === 1) add('pair',ranks[0]);
  if (n === 2 && ranks[0] === 16 && ranks[1] === 17) add('rocket',17);
  if (n === 3 && ranks.length === 1) add('triple',ranks[0]);
  if (n === 4 && ranks.length === 1) add('bomb',ranks[0]);
  for (const r of ranks) {
    const count = grouped.get(r)!.length;
    const rest = ranks.filter(x => x !== r);
    if (count === 3 && n === 4) add('tripleSingle',r,1,'single');
    if (count === 3 && n === 5 && rest.length === 1 && grouped.get(rest[0])!.length === 2) add('triplePair',r,1,'pair');
    if (count === 4 && n === 6 && !(grouped.has(16) && grouped.has(17))) add('fourSingle',r,1,'single');
    if (count === 4 && n === 8 && rest.length === 2 && rest.every(x => grouped.get(x)!.length === 2)) add('fourPair',r,1,'pair');
  }
  if (n >= 5 && ranks.length === n && consecutive(ranks)) add('straight',ranks[ranks.length-1],ranks.length);
  if (ranks.length >= 3 && ranks.every(r => grouped.get(r)!.length === 2) && consecutive(ranks)) add('pairStraight',ranks[ranks.length-1],ranks.length);
  for (let start = 3; start <= 13; start++) for (let k = 2; start+k-1 <= 14; k++) {
    const body = Array.from({length:k},(_,i) => start+i);
    if (!body.every(r => grouped.get(r)?.length === 3)) continue;
    const rest = ranks.filter(r => !body.includes(r));
    if (n === 3*k) add('airplane',start+k-1,k);
    if (n === 4*k && rest.every(r => grouped.get(r)!.length <= 2) && !(grouped.has(16) && grouped.has(17))) add('airplaneSingle',start+k-1,k,'single');
    if (n === 5*k && rest.length === k && rest.every(r => grouped.get(r)!.length === 2)) add('airplanePair',start+k-1,k,'pair');
  }
  return result;
}
export function beats(combo: Combo, target: Combo): boolean {
  if (target.kind === 'rocket') return false;
  if (combo.kind === 'rocket') return true;
  if (combo.kind === 'bomb' && target.kind !== 'bomb') return true;
  return combo.kind === target.kind && combo.bodyLength === target.bodyLength && combo.wing === target.wing && combo.bodyRank > target.bodyRank;
}
export function chooseCombo(cards: readonly Card[], target: Combo | null = null): Combo | null {
  return analyzeCards(cards).filter(c => !target || beats(c,target)).sort((a,b) => b.bodyLength-a.bodyLength || b.bodyRank-a.bodyRank || a.kind.localeCompare(b.kind))[0] ?? null;
}
// Enumerate wing counts by rank, keeping a bounded set of physical-equivalent
// representatives. Manual selections always use the complete analyzer above.
function* wings(grouped: Map<number, Card[]>, body: number[], count: number, pair: boolean): Generator<Card[] | null> {
  const ranks = [...grouped.keys()].filter(r => !body.includes(r) && (!pair || grouped.get(r)!.length >= 2));
  let emitted = 0;
  function* visit(index: number, left: number, chosen: Card[]): Generator<Card[] | null> {
    yield null;
    if (emitted >= 64) return;
    if (left === 0) {
      if (!(chosen.some(c => c.rank === 16) && chosen.some(c => c.rank === 17))) { emitted++; yield chosen; }
      return;
    }
    for (let i = index; i < ranks.length; i++) {
      yield null;
      if (emitted >= 64) return;
      const available = grouped.get(ranks[i])!;
      for (let take = 1; take <= Math.min(pair ? 1 : 2, pair ? left : Math.min(left,available.length)); take++) {
        yield* visit(i+1,left-take,[...chosen,...available.slice(0,pair ? 2 : take)]);
      }
    }
  }
  yield* visit(0,count,[]);
}
/** Null is an exploration checkpoint, including branches with no legal output. */
export function* iteratePlays(hand: readonly Card[], target: Combo | null = null): Generator<Play | null> {
  yield null;
  const grouped = groups(hand), seen = new Set<string>();
  function* add(selection: Card[]): Generator<Play | null> {
    yield null;
    const cards = sortCards(selection), key = cards.map(c => c.id).join('|');
    if (seen.has(key)) return;
    const combo = chooseCombo(cards,target);
    if (combo) { seen.add(key); yield {cards,combo}; }
  }
  for (const [r,list] of grouped) {
    yield null;
    for (let take = 1; take <= Math.min(list.length,4); take++) yield* add(list.slice(0,take));
    if (list.length >= 3) for (const pair of [false,true]) for (const wing of wings(grouped,[r],1,pair)) {
      if (wing === null) yield null; else yield* add([...list.slice(0,3),...wing]);
    }
    if (list.length === 4) for (const pair of [false,true]) for (const wing of wings(grouped,[r],2,pair)) {
      if (wing === null) yield null; else yield* add([...list,...wing]);
    }
  }
  if (grouped.has(16) && grouped.has(17)) yield* add([...grouped.get(16)!,...grouped.get(17)!]);
  for (const [copies,min] of [[1,5],[2,3],[3,2]]) for (let start = 3; start <= 14; start++) {
    yield null;
    let body: number[] = [], selection: Card[] = [];
    for (let end = start; end <= 14 && (grouped.get(end)?.length ?? 0) >= copies; end++) {
      yield null;
      body = [...body,end]; selection = [...selection,...grouped.get(end)!.slice(0,copies)];
      if (body.length < min) continue;
      yield* add(selection);
      if (copies === 3) for (const pair of [false,true]) for (const wing of wings(grouped,body,body.length,pair)) {
        if (wing === null) yield null; else yield* add([...selection,...wing]);
      }
    }
  }
}
export function generatePlays(hand: readonly Card[], target: Combo | null = null): Play[] {
  const plays: Play[] = [];
  for (const play of iteratePlays(hand,target)) if (play) plays.push(play);
  return plays;
}
