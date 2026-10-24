import { createDeck, createSeededRandom } from '../cards';
import { applyAction, createGame } from '../engine';
import { Action, GameState, Seat } from '../types';
import { buildObservation } from './observation';
import { chooseHardAction, sampleHiddenStateSteps } from './search';
import * as heuristic from './heuristic';

function playing(seed = 51): GameState {
  let state = createGame({random:createSeededRandom(seed),startingSeat:0,gameId:'search'});
  for (const type of ['call','declineGrab','declineGrab'] as const) state = applyAction(state,{type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision}).state;
  return state;
}
function token(state: GameState, type: Action['type'], cardIds?: string[]): Action {
  return {type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision,...(cardIds ? {cardIds} : {})};
}
function sample(state: GameState, seat: Seat, seed: number): GameState {
  const iterator = sampleHiddenStateSteps(buildObservation(state,seat,{includeLegalActions:false}),createSeededRandom(seed));
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  expect(step.value).toBeDefined();
  return step.value;
}
const unlimitedClock = {clock:() => 0,timeBudgetMs:10000,workBudget:100000,yieldWork:async () => {}};

test.each(['lead','follow'] as const)('zero node budget gives a cheap engine-legal %s fallback', async situation => {
  let state = playing();
  if (situation === 'follow') state = applyAction(state,token(state,'play',[state.hands[0][0].id])).state;
  const result = await chooseHardAction(buildObservation(state,state.currentSeat,{includeLegalActions:false}),{...unlimitedClock,nodeBudget:0});
  expect(result.action).not.toBeNull(); expect(applyAction(state,result.action!).ok).toBe(true);
  if (situation === 'lead') expect(result.action!.type).toBe('play');
  expect(result.diagnostics).toMatchObject({samples:0,simulatedNodes:0,candidateCount:0,workUnits:0});
  expect(result.status).toBe('budget');
});

test('sampled ownership preserves self, known landlord cards, played cards and replayable 54-card deals', () => {
  let state = playing();
  const bottom = state.publicBottomCards[0];
  state = applyAction(state,token(state,'play',[bottom.id])).state;
  const sampled = sample(state,1,303);
  expect(sampled.hands[1]).toEqual(state.hands[1]);
  expect(sampled.hands.map(hand => hand.length)).toEqual(state.hands.map(hand => hand.length));
  for (const card of state.publicBottomCards.slice(1)) expect(sampled.hands[0].map(c => c.id)).toContain(card.id);
  expect(sampled.hands.flat().map(card => card.id)).not.toContain(bottom.id);
  expect(sampled.initialDeal.hands.map(hand => hand.length)).toEqual([17,17,17]);
  expect(new Set([...sampled.initialDeal.hands.flat(),...sampled.initialDeal.bottomCards].map(card => card.id)).size).toBe(54);
  expect(sampled.history).toEqual(state.history); expect(sampled.target).toEqual(state.target);
  expect(sample(state,1,304).hands[2]).not.toEqual(sampled.hands[2]);
});

test('a public pass does not exclude possible beating cards from the passer', () => {
  let state = playing();
  state = applyAction(state,token(state,'play',[state.hands[0][0].id])).state;
  state = applyAction(state,token(state,'pass')).state;
  const sampled = sample(state,2,41);
  expect(sampled.hands[1].some(card => card.rank > state.target!.bodyRank)).toBe(true);
});

test('hard decisions actually sample and apply bounded engine simulation nodes', async () => {
  const state = playing();
  const result = await chooseHardAction(buildObservation(state,0,{includeLegalActions:false}),{...unlimitedClock,random:createSeededRandom(43),nodeBudget:20,candidateLimit:3,rolloutDepth:3,sampleRounds:2});
  expect(result.diagnostics.samples).toBeGreaterThan(0);
  expect(result.diagnostics.simulatedNodes).toBeGreaterThan(3);
  expect(result.diagnostics.simulatedNodes).toBeLessThanOrEqual(20);
  expect(result.diagnostics.candidateCount).toBeGreaterThan(3);
  expect(applyAction(state,result.action!).ok).toBe(true);
});

test('fixed observation, seed, budgets and clock are reproducible across hidden ownership changes', async () => {
  const state = playing(), changed = JSON.parse(JSON.stringify(state)) as GameState;
  [changed.hands[1][0],changed.hands[2][0]] = [changed.hands[2][0],changed.hands[1][0]];
  const run = (input:GameState) => chooseHardAction(buildObservation(input,0,{includeLegalActions:false}),{...unlimitedClock,random:createSeededRandom(8),nodeBudget:12,candidateLimit:2,rolloutDepth:3,sampleRounds:2});
  const first = await run(state);
  expect(first.diagnostics.samples).toBeGreaterThan(0);
  expect(await run(state)).toEqual(first); expect(await run(changed)).toEqual(first);
});

test('cancelling before work or in the first generation yield returns no submittable action', async () => {
  const obs = buildObservation(playing(),0,{includeLegalActions:false});
  const before = await chooseHardAction(obs,{signal:{aborted:true}});
  expect(before.status).toBe('cancelled'); expect(before.action).toBeNull();
  const signal = {aborted:false};
  const middle = await chooseHardAction(obs,{...unlimitedClock,signal,sliceMs:0,yieldWork:async () => {signal.aborted = true;}});
  expect(middle.status).toBe('cancelled'); expect(middle.action).toBeNull();
  expect(middle.diagnostics.yields).toBe(1); expect(middle.diagnostics.samples).toBe(0);
});

test('generation itself yields within time slices before sampling, and includes generation in the total deadline', async () => {
  let now = 0;
  const state = playing(33), obs = buildObservation(state,0,{includeLegalActions:false});
  const result = await chooseHardAction(obs,{clock:() => now++,timeBudgetMs:20,sliceMs:3,random:createSeededRandom(1),yieldWork:async () => {}});
  expect(result.status).toBe('budget'); expect(result.diagnostics.yields).toBeGreaterThan(0);
  expect(result.diagnostics.samples).toBe(0); expect(result.diagnostics.maxSliceMs).toBeLessThanOrEqual(5);
  expect(result.diagnostics.elapsedMs).toBeLessThanOrEqual(22); expect(applyAction(state,result.action!).ok).toBe(true);
});

test.each(['clock','random','yield'] as const)('a failing %s returns the current legal fallback', async failure => {
  const state = playing();
  const options = {...unlimitedClock,random:createSeededRandom(1)};
  if (failure === 'clock') options.clock = () => {throw new Error('clock unavailable');};
  if (failure === 'random') options.random = () => {throw new Error('rng unavailable');};
  if (failure === 'yield') options.yieldWork = async () => {throw new Error('scheduler failed');};
  const result = await chooseHardAction(buildObservation(state,0,{includeLegalActions:false}),options);
  expect(result.status).toBe('error'); expect(applyAction(state,result.action!).ok).toBe(true);
});

test('zero time budget or exhausted work budget cannot start simulation', async () => {
  const state = playing(), obs = buildObservation(state,0,{includeLegalActions:false});
  for (const options of [{timeBudgetMs:0},{workBudget:2}]) {
    const result = await chooseHardAction(obs,{...unlimitedClock,...options});
    expect(result.status).toBe('budget'); expect(result.diagnostics.simulatedNodes).toBe(0);
    expect(applyAction(state,result.action!).ok).toBe(true);
  }
});

test('finished and offturn snapshots do not generate candidates or submit actions', async () => {
  const state = playing();
  for (const obs of [buildObservation(state,1,{includeLegalActions:false}),buildObservation({...state,phase:'finished'},0,{includeLegalActions:false})]) {
    const result = await chooseHardAction(obs,unlimitedClock);
    expect(result.action).toBeNull(); expect(result.status).toBe('inactive'); expect(result.diagnostics.workUnits).toBe(0);
  }
});

test('a returned action carries the original revision and the real engine rejects it after a later move', async () => {
  const state = playing(), result = await chooseHardAction(buildObservation(state,0,{includeLegalActions:false}),{...unlimitedClock,nodeBudget:0});
  expect(result.action).not.toBeNull();
  const advanced = applyAction(state,result.action!).state;
  expect(applyAction(advanced,result.action!).ok).toBe(false);
});

test('a dense twenty-card hand yields and can cancel during generation before sampling or a full move list', async () => {
  const deck = createDeck();
  let state = createGame({gameId:'dense',initialDeal:{hands:[deck.slice(0,17),deck.slice(20,37),deck.slice(37)],bottomCards:deck.slice(17,20),startingSeat:0}});
  for (const type of ['call','declineGrab','declineGrab'] as const) state = applyAction(state,token(state,type)).state;
  expect(state.hands[0]).toHaveLength(20); expect(state.hands[0].every(card => card.rank <= 7)).toBe(true);
  const signal = {aborted:false};
  const result = await chooseHardAction(buildObservation(state,0,{includeLegalActions:false}),{...unlimitedClock,signal,yieldWork:async () => {signal.aborted = true;}});
  expect(result.status).toBe('cancelled'); expect(result.action).toBeNull();
  expect(result.diagnostics).toMatchObject({samples:0,simulatedNodes:0,yields:1,workUnits:32});
  expect(result.diagnostics.candidateCount).toBeLessThan(20);
});

test('real rollout scoring receives only each acting seat observation without any synthetic full state', async () => {
  const audit = jest.spyOn(heuristic,'rankActions');
  try {
    const state = playing();
    const result = await chooseHardAction(buildObservation(state,0,{includeLegalActions:false}),{...unlimitedClock,random:createSeededRandom(9),nodeBudget:8,candidateLimit:1,rolloutDepth:3,sampleRounds:1});
    expect(result.diagnostics.simulatedNodes).toBe(4); expect(applyAction(state,result.action!).ok).toBe(true);
    const inputs = audit.mock.calls.map(([view]) => view);
    expect(new Set(inputs.map(view => view.seat))).toEqual(new Set([0,1,2]));
    for (const view of inputs) {
      expect(view.hand.length).toBe(view.remainingCounts[view.seat]); expect(view.seat).toBe(view.currentSeat);
      expect(view).not.toHaveProperty('hands'); expect(view).not.toHaveProperty('initialDeal'); expect(view).not.toHaveProperty('bottomCards');
      expect(view.legalActions).toBeUndefined();
    }
  } finally {audit.mockRestore();}
});
