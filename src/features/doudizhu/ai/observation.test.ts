import { createSeededRandom } from '../cards';
import { applyAction, createGame } from '../engine';
import { GameState } from '../types';
import { buildObservation } from './observation';

function playing(): GameState {
  let state = createGame({ random:createSeededRandom(31), startingSeat:0, gameId:'visible' });
  for (const type of ['call','declineGrab','declineGrab'] as const) {
    state = applyAction(state,{type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision}).state;
  }
  return state;
}

test('calling observation hides bottom cards and every opponent hand and snapshot', () => {
  const state = createGame({random:createSeededRandom(31),startingSeat:0});
  const obs = buildObservation(state,0);
  expect(obs.hand).toEqual(state.hands[0]);
  expect(obs.publicBottomCards).toEqual([]);
  expect(obs.remainingCounts).toEqual([17,17,17]);
  expect(obs).not.toHaveProperty('hands'); expect(obs).not.toHaveProperty('bottomCards');
  expect(obs).not.toHaveProperty('initialDeal');
  const serialized = JSON.stringify(obs);
  for (const card of [...state.hands[1],...state.hands[2],...state.bottomCards]) expect(serialized).not.toContain(JSON.stringify(card.id));
});

test('swapping hidden ownership leaves complete visible observations equal', () => {
  const state = playing(), changed = JSON.parse(JSON.stringify(state)) as GameState;
  [changed.hands[1][0],changed.hands[2][0]] = [changed.hands[2][0],changed.hands[1][0]];
  expect(buildObservation(state,0)).toEqual(buildObservation(changed,0));
});

test('all nested visible data and legal action ids are detached from the engine', () => {
  let state = playing();
  const first = buildObservation(state,0).legalActions?.find(a => a.type === 'play');
  expect(first).toBeDefined();
  state = applyAction(state,first!).state;
  const before = JSON.stringify(state), obs = buildObservation(state,1);
  obs.hand[0].rank = 99; obs.publicBottomCards[0].rank = 99;
  obs.bidding.declined.push(2); obs.bidding.queue.push(0);
  obs.target!.bodyRank = 99; obs.targetCards[0].rank = 99;
  obs.history[0].action.type = 'pass';
  obs.history[3].action.cardIds!.push('bad'); obs.history[3].combo!.bodyRank = 99;
  obs.legalActions?.find(a => a.type === 'play')?.cardIds?.push('bad');
  obs.remainingCounts[0] = 99;
  expect(JSON.stringify(state)).toBe(before);
});

test('candidate generation can be omitted and offturn or finished observations have no actions', () => {
  const state = playing();
  expect(buildObservation(state,0,{includeLegalActions:false}).legalActions).toBeUndefined();
  expect(buildObservation(state,1).legalActions).toEqual([]);
  expect(buildObservation({...state,phase:'finished'},0).legalActions).toEqual([]);
  expect(buildObservation(state,0).publicBottomCards).toEqual(state.bottomCards);
});
