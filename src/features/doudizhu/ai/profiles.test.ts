import { searchProfiles } from './profiles';
import { chooseExpertAction } from './search';
import { createGame, applyAction } from '../engine';
import { createSeededRandom } from '../cards';
import { buildObservation } from './observation';

test('hard keeps its budget and expert expands bounded search', () => {
  expect(searchProfiles.hard).toEqual({nodeBudget:400,timeBudgetMs:150,workBudget:20000,candidateLimit:4,sampleRounds:4,rolloutDepth:12,sliceMs:8});
  expect(searchProfiles.expert).toEqual({nodeBudget:3200,timeBudgetMs:800,workBudget:80000,candidateLimit:8,sampleRounds:12,rolloutDepth:24,sliceMs:8});
});
function playing() {
  let state = createGame({startingSeat:0,random:createSeededRandom(51),gameId:'expert'});
  for (const type of ['call','declineGrab','declineGrab'] as const) state = applyAction(state,{type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision}).state;
  return state;
}
test('expert zero budgets remain legal and cancellation returns no action', async () => {
  const state = playing(), obs = buildObservation(state,0,{includeLegalActions:false});
  for (const budget of [{nodeBudget:0},{workBudget:0},{timeBudgetMs:0}]) {
    const result = await chooseExpertAction(obs,budget);
    expect(result.status).toBe('budget'); expect(applyAction(state,result.action!).ok).toBe(true);
    expect(result.diagnostics.simulatedNodes).toBe(0);
  }
  const signal = {aborted:false};
  const result = await chooseExpertAction(obs,{signal,sliceMs:0,yieldWork:async () => {signal.aborted=true;}});
  expect(result.status).toBe('cancelled'); expect(result.action).toBeNull();
});
test('expert caps overrides and stays reproducible across hidden ownership', async () => {
  const state = playing(), changed = JSON.parse(JSON.stringify(state));
  [changed.hands[1][0],changed.hands[2][0]] = [changed.hands[2][0],changed.hands[1][0]];
  const run = (input:typeof state) => chooseExpertAction(buildObservation(input,0,{includeLegalActions:false}),{clock:()=>0,random:createSeededRandom(8),nodeBudget:16,workBudget:800000,timeBudgetMs:80000,yieldWork:async()=>{}});
  const result = await run(state);
  expect(result.diagnostics.simulatedNodes).toBeLessThanOrEqual(16); expect(result.diagnostics.samples).toBeGreaterThan(0);
  expect(await run(changed)).toEqual(result); expect(applyAction(state,result.action!).ok).toBe(true);
});

test('oversized expert requests cannot exceed any profile ceiling', async () => {
  const state = playing(), obs = buildObservation(state,0,{includeLegalActions:false});
  const result = await chooseExpertAction(obs,{clock:()=>0,random:createSeededRandom(8),nodeBudget:1e6,workBudget:1e6,timeBudgetMs:1e6,candidateLimit:1e6,sampleRounds:1e6,rolloutDepth:1e6,yieldWork:async()=>{}});
  expect(result.diagnostics.simulatedNodes).toBeLessThanOrEqual(3200);
  expect(result.diagnostics.workUnits).toBeLessThanOrEqual(80000);
  expect(result.diagnostics.samples).toBeLessThanOrEqual(12);
  expect(result.diagnostics.simulatedNodes).toBeGreaterThan(400);
  expect(applyAction(state,result.action!).ok).toBe(true);
  let now=0;
  const timed = await chooseExpertAction(obs,{clock:()=>now++,timeBudgetMs:1e6,nodeBudget:1e6,workBudget:1e6,yieldWork:async()=>{}});
  expect(timed.status).toBe('budget'); expect(timed.diagnostics.elapsedMs).toBeLessThanOrEqual(800);
  expect(timed.diagnostics.maxSliceMs).toBeLessThanOrEqual(10);
});
