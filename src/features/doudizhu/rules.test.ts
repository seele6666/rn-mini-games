import { createDeck, createSeededRandom, shuffleDeck } from './cards';
import { analyzeCards, beats, chooseCombo, generatePlays, iteratePlays } from './rules';
import { Card } from './types';
const cards = (ranks: number[]): Card[] => ranks.map((rank, i) => ({ rank, id: `${rank}-${i}` }));
describe('physical cards', () => {
  test('single deck contains 54 unique cards and exactly one of each joker', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(54);
    expect(new Set(deck.map(c => c.id)).size).toBe(54);
    for (let rank = 3; rank <= 15; rank++) expect(deck.filter(c => c.rank === rank)).toHaveLength(4);
    expect(deck.filter(c => c.rank > 15).map(c => c.rank)).toEqual([16, 17]);
  });
  test('seeded shuffle is reproducible and preserves the deck', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, createSeededRandom(42));
    expect(shuffled).toEqual(shuffleDeck(deck, createSeededRandom(42)));
    expect(shuffled).not.toEqual(deck);
    expect([...shuffled].sort((a,b) => a.id.localeCompare(b.id))).toEqual([...deck].sort((a,b) => a.id.localeCompare(b.id)));
  });
});
describe('fixed combination rules', () => {
  test('incremental generator preserves structural order and exposes exploration checkpoints', () => {
    const steps = [...iteratePlays(cards([3,3,3,4]))];
    const plays = steps.filter(play => play !== null);
    expect(plays.map(play => play!.combo.kind)).toEqual(['single','pair','triple','tripleSingle','single']);
    expect(plays.map(play => play!.cards.map(card => card.id))).toEqual([
      ['3-0'],['3-0','3-1'],['3-0','3-1','3-2'],['3-0','3-1','3-2','4-3'],['4-3'],
    ]);
    expect(steps.filter(play => play === null).length).toBeGreaterThan(plays.length);
    expect(plays).toEqual(generatePlays(cards([3,3,3,4])));
  });
  test.each([
    [[3], 'single'], [[3,3], 'pair'], [[3,3,3], 'triple'], [[3,3,3,4], 'tripleSingle'],
    [[3,3,3,4,4], 'triplePair'], [[3,4,5,6,7], 'straight'], [[3,3,4,4,5,5], 'pairStraight'],
    [[3,3,3,4,4,4], 'airplane'], [[3,3,3,4,4,4,5,5], 'airplaneSingle'],
    [[3,3,3,4,4,4,5,5,6,6], 'airplanePair'], [[3,3,3,3,4,4], 'fourSingle'],
    [[3,3,3,3,4,4,5,5], 'fourPair'], [[3,3,3,3], 'bomb'], [[16,17], 'rocket'],
  ])('recognizes %j as %s', (ranks, kind) => expect(chooseCombo(cards(ranks as number[]))?.kind).toBe(kind));
  test.each([[], [3,4,5,6], [3,3,4,4], [11,12,13,14,15], [3,3,3,4,4,4,16,17],
    [3,3,3,3,16,17], [3,3,3,3,4,4,4,4], [3,3,3,3,4,4,4,5], [16,16], [17,17,17],
    [3,3,3,4,4,4,5,5,5,5,6,6]])('rejects invalid selection %j', (...ranks) => expect(analyzeCards(cards(ranks))).toEqual([]));
  test('rejects repeated physical IDs even when ranks form a pair', () => expect(analyzeCards([{id:'x',rank:3},{id:'x',rank:3}])).toEqual([]));
  test('comparison ignores wings and suits but matches shape', () => {
    expect(beats(chooseCombo(cards([4,4,4,5,5]))!,chooseCombo(cards([3,3,3,6,6]))!)).toBe(true);
    expect(beats(chooseCombo(cards([4,4,4,5]))!,chooseCombo(cards([3,3,3,6,6]))!)).toBe(false);
    expect(beats(chooseCombo(cards([4,4,4,4,5,5]))!,chooseCombo(cards([3]))!)).toBe(false);
    expect(beats(chooseCombo(cards([4,4,4,4]))!,chooseCombo(cards([17]))!)).toBe(true);
    expect(beats(chooseCombo(cards([16,17]))!,chooseCombo(cards([15,15,15,15]))!)).toBe(true);
  });
  test('ambiguous airplane chooses longest body then highest rank', () => {
    const selection = cards([3,3,3,4,4,4,5,5,5,6,6,6]);
    expect(chooseCombo(selection)).toMatchObject({kind:'airplane',bodyLength:4,bodyRank:6});
  });
  test('generator covers every structural kind and each generated action revalidates', () => {
    const hands = [createDeck(), cards([3,3,3,3,4,4,4,5,5,5,6,6,7,7,8,9,10,16,17])];
    for (const hand of hands) {
      const plays = generatePlays(hand);
      expect(plays.length).toBeGreaterThan(0);
      for (const play of plays) {
        expect(chooseCombo(play.cards)).toEqual(play.combo);
        expect(play.cards.every(c => hand.some(h => h.id === c.id))).toBe(true);
      }
    }
    const kinds = new Set(generatePlays(createDeck()).map(p => p.combo.kind));
    expect(kinds.size).toBe(14);
    const target = chooseCombo(cards([8,8]))!;
    expect(generatePlays(createDeck(),target).every(p => beats(p.combo,target))).toBe(true);
  });
});
