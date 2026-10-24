import { createDeck, createSeededRandom } from '../cards';
import { applyAction, createGame } from '../engine';
import { chooseCombo } from '../rules';
import { GameState, Seat } from '../types';
import { buildObservation } from './observation';
import { chooseAction, rankActions, suggestAction } from './heuristic';

function fixture(ranks: number[]): GameState {
  const deck = createDeck();
  const hand = ranks.map(rank => deck.splice(deck.findIndex(c => c.rank === rank),1)[0]);
  return {...createGame({random:createSeededRandom(1),startingSeat:0}),phase:'playing',landlord:0,hands:[hand,deck.slice(0,17),deck.slice(17,34)]};
}

test('simple lead prefers a small intact pair over splitting it or spending high cards', () => {
  const state = fixture([3,3,9,14,15,16]);
  const action = chooseAction(buildObservation(state,0),{random:() => .9,difficulty:'easy'});
  expect(action?.cardIds).toEqual(['3-clubs','3-diamonds']);
  expect(applyAction(state,action!).ok).toBe(true);
});

test('calling and grabbing value own high cards and combinations', () => {
  for (const phase of ['calling','grabbing'] as const) {
    const strong = {...fixture([14,14,14,15,15,16,17]),phase};
    const weak = {...fixture([3,5,7,9,11,12,13]),phase};
    expect(chooseAction(buildObservation(strong,0),{random:() => .9})?.type).toBe(phase === 'calling' ? 'call' : 'grab');
    expect(chooseAction(buildObservation(weak,0),{random:() => .9})?.type).toBe(phase === 'calling' ? 'declineCall' : 'declineGrab');
  }
});

test('same observation and policy random seed choose the same move regardless of hidden ownership', () => {
  const state = fixture([3,3,4,4,5,8,12]);
  const changed = JSON.parse(JSON.stringify(state)) as GameState;
  [changed.hands[1][0],changed.hands[2][0]] = [changed.hands[2][0],changed.hands[1][0]];
  expect(chooseAction(buildObservation(state,0),{random:createSeededRandom(8)})).toEqual(chooseAction(buildObservation(changed,0),{random:createSeededRandom(8)}));
});

test('simple policy uses independent randomness among reasonable choices', () => {
  const obs = buildObservation(fixture([3,5,7,14]),0);
  const preferred = chooseAction(obs,{random:() => .9});
  const alternative = chooseAction(obs,{random:() => .1});
  expect(preferred?.cardIds).toEqual(['3-clubs']);
  expect(alternative).not.toEqual(preferred);
});

test('no move is chosen offturn or after the result', () => {
  const state = fixture([3,4]);
  expect(chooseAction(buildObservation(state,1))).toBeNull();
  expect(chooseAction(buildObservation({...state,phase:'finished'},0))).toBeNull();
});

test('only pass is returned when no response can beat the target', () => {
  const state = {...fixture([3,4]),target:{kind:'single' as const,bodyLength:1,bodyRank:17,wing:'none' as const},lastPlayer:2 as Seat};
  const action = chooseAction(buildObservation(state,0));
  expect(action?.type).toBe('pass'); expect(applyAction(state,action!).ok).toBe(true);
});

test.each([1,7,23,91,313])('all three easy policies finish seed %s using real accepted engine moves', seed => {
  const dealRandom = createSeededRandom(seed), policyRandom = createSeededRandom(seed+1000);
  let state = createGame({random:dealRandom,gameId:`seed-${seed}`});
  for (let turns = 0; turns < 700 && state.phase !== 'finished'; turns++) {
    const action = chooseAction(buildObservation(state,state.currentSeat),{random:policyRandom,difficulty:'easy'});
    expect(action).not.toBeNull();
    const result = applyAction(state,action!,{random:dealRandom});
    expect(result.ok).toBe(true); state = result.state;
  }
  expect(state.phase).toBe('finished'); expect(state.winner).not.toBeNull();
});

test('policy difficulty and decisions do not consume or alter the deal random stream', () => {
  const easy = createGame({random:createSeededRandom(42),difficulty:'easy'});
  const hard = createGame({random:createSeededRandom(42),difficulty:'hard'});
  chooseAction(buildObservation(easy,easy.currentSeat),{random:createSeededRandom(99),difficulty:'easy'});
  chooseAction(buildObservation(hard,hard.currentSeat),{random:createSeededRandom(99),difficulty:'hard'});
  expect(easy.initialDeal).toEqual(hard.initialDeal);
});

describe('normal tactics and human hints', () => {
  const normal = {difficulty:'normal' as const,random:() => .9};
  test('finishes immediately with a rocket rather than saving control cards', () => {
    const state = fixture([16,17]), obs = buildObservation(state,0);
    const action = chooseAction(obs,normal);
    expect(action?.cardIds).toEqual(['joker-small','joker-big']);
    expect(applyAction(state,action!).state.phase).toBe('finished');
  });

  test.each([
    {hand:[3,4,5,6,7,10],want:['10-clubs']},
    {hand:[4,4,6,9],want:['6-clubs']},
    {hand:[4,4,4,4,8,11],want:['8-clubs']},
  ])('preserves intact structures when responding with $hand', ({hand,want}) => {
    const state = {...fixture(hand),target:{kind:'single' as const,bodyLength:1,bodyRank:2,wing:'none' as const},lastPlayer:2 as Seat};
    const action = chooseAction(buildObservation(state,0),normal);
    expect(action?.cardIds).toEqual(want); expect(applyAction(state,action!).ok).toBe(true);
  });

  test('remaining-turn estimate favours removing a straight over fragmenting it', () => {
    const obs = buildObservation(fixture([3,4,5,6,7,10,10]),0);
    const ranked = rankActions(obs);
    const straight = ranked.find(row => row.action.cardIds?.length === 5)!;
    const single = ranked.find(row => row.action.cardIds?.join() === '3-clubs')!;
    expect(straight.reasons.remainingTurns).toBe(1);
    expect(single.reasons.remainingTurns).toBeGreaterThan(1);
    expect(straight.score).toBeLessThan(single.score);
  });

  test('a remaining triple and single are one legal turn rather than two', () => {
    const ranked = rankActions(buildObservation(fixture([3,3,3,6,7]),0));
    const seven = ranked.find(row => row.action.cardIds?.join() === '7-clubs')!;
    expect(seven.reasons.remainingTurns).toBe(1);
  });

  test.each([{hand:[3,3,3,3,6,7]},{hand:[3,3,3,4,4,4,6,7]}])('recognizes the whole remaining combination $hand as one turn', ({hand}) => {
    const ranked = rankActions(buildObservation(fixture([...hand,10]),0));
    const ten = ranked.find(row => row.action.cardIds?.join() === '10-clubs')!;
    expect(ten.reasons.remainingTurns).toBe(1);
  });

  test('leads a combination from bombs when the entire remainder is a legal final play', () => {
    const state = fixture([3,3,3,3,4,4,4,4,5,5,5,5,6,7]);
    const action = chooseAction(buildObservation(state,0),normal);
    const result = applyAction(state,action!);
    expect(result.ok).toBe(true);
    expect(chooseCombo(result.state.hands[0])).not.toBeNull();
  });

  test('blocks a next opponent with one card using high singles', () => {
    const state = {...fixture([4,9,15]),target:{kind:'single' as const,bodyLength:1,bodyRank:3,wing:'none' as const},lastPlayer:2 as Seat};
    state.hands[1] = state.hands[1].slice(0,1);
    expect(chooseAction(buildObservation(state,0),normal)?.cardIds).toEqual(['15-clubs']);
  });



  test('uses a high single to take control without spending an entire bomb', () => {
    const state = {...fixture([3,4,5,6,7,15,15,15,15]),target:{kind:'single' as const,bodyLength:1,bodyRank:14,wing:'none' as const},lastPlayer:2 as Seat};
    state.hands[2] = state.hands[2].slice(0,2);
    state.history.push({action:{type:'play',seat:1,gameId:state.gameId,dealId:state.dealId,revision:0,cardIds:['joker-small','joker-big']},combo:{kind:'rocket',bodyLength:1,bodyRank:17,wing:'none'}});
    const action = chooseAction(buildObservation(state,0),normal);
    expect(action?.cardIds).toEqual(['15-clubs']);
    expect(applyAction(state,action!).ok).toBe(true);
  });

  test('a public pass does not prove that unseen jokers cannot beat a high single', () => {
    const state = {...fixture([3,4,5,6,7,15,15,15,15]),target:{kind:'single' as const,bodyLength:1,bodyRank:14,wing:'none' as const},lastPlayer:2 as Seat};
    state.history.push({action:{type:'pass',seat:1,gameId:state.gameId,dealId:state.dealId,revision:0}});
    const action = chooseAction(buildObservation(state,0),normal);
    expect(action?.cardIds).toEqual(['15-clubs','15-diamonds','15-hearts','15-spades']);
    expect(applyAction(state,action!).ok).toBe(true);
  });

  test.each([1,2] as Seat[])('farmer %s lets a near-finished teammate keep the lead', seat => {
    const state = fixture([6,9,15]);
    state.hands[seat] = state.hands[0]; state.hands[0] = createDeck().slice(20,28);
    const teammate = (seat === 1 ? 2 : 1) as Seat;
    state.hands[teammate] = createDeck().slice(30,31);
    state.currentSeat = seat; state.lastPlayer = teammate;
    state.target = {kind:'single',bodyLength:1,bodyRank:5,wing:'none'};
    expect(chooseAction(buildObservation(state,seat),normal)?.type).toBe('pass');
  });



  test('farmer takes an immediate team win instead of passing to a teammate', () => {
    const state = fixture([6]);
    state.hands[1] = state.hands[0]; state.hands[0] = createDeck().slice(20,28);
    state.currentSeat = 1; state.lastPlayer = 2; state.target = {kind:'single',bodyLength:1,bodyRank:5,wing:'none'};
    expect(chooseAction(buildObservation(state,1),normal)?.cardIds).toEqual(['6-clubs']);
  });



  test('farmer feeds a low single to the next teammate with one card', () => {
    const state = fixture([4,4,7,13]);
    state.hands[1] = state.hands[0]; state.hands[0] = createDeck().slice(20,28); state.hands[2] = createDeck().slice(35,36);
    state.currentSeat = 1;
    expect(chooseAction(buildObservation(state,1),normal)?.cardIds).toEqual(['4-clubs']);
  });

  test('hints are detached legal suggestions and leave all engine and observation data untouched', () => {
    const state = fixture([16,17]), before = JSON.stringify(state), obs = buildObservation(state,0), obsBefore = JSON.stringify(obs);
    const hint = suggestAction(obs,normal);
    expect(hint?.cardIds).toEqual(['joker-small','joker-big']);
    expect(applyAction(state,hint!).ok).toBe(true);
    hint!.cardIds!.push('invalid');
    expect(JSON.stringify(state)).toBe(before); expect(JSON.stringify(obs)).toBe(obsBefore);
  });

  test('hint execution requires the human playing turn and returns legal pass when blocked', () => {
    const state = fixture([3,4]);
    expect(suggestAction(buildObservation({...state,currentSeat:1},1),normal)).toBeNull();
    expect(suggestAction(buildObservation({...state,phase:'calling'},0),normal)).toBeNull();
    expect(suggestAction(buildObservation({...state,phase:'finished'},0),normal)).toBeNull();
    state.target = {kind:'single',bodyLength:1,bodyRank:17,wing:'none'}; state.lastPlayer = 2;
    expect(suggestAction(buildObservation(state,0),normal)?.type).toBe('pass');
  });

  test('normal and hard fallback use stable visible scores regardless of candidate ordering or hidden ownership', () => {
    const state = fixture([3,4,5,6,7,10]), obs = buildObservation(state,0);
    const ranked = rankActions(obs), reversed = rankActions(obs,[...obs.legalActions!].reverse());
    expect(ranked.length).toBeGreaterThan(0); expect(ranked).toEqual(reversed);
    const changed = JSON.parse(JSON.stringify(state)) as GameState;
    [changed.hands[1][0],changed.hands[2][0]] = [changed.hands[2][0],changed.hands[1][0]];
    expect(chooseAction(obs,normal)).toEqual(chooseAction(buildObservation(changed,0),normal));
    expect(chooseAction(obs,{difficulty:'hard'})).toEqual(chooseAction(obs,normal));
  });
});

