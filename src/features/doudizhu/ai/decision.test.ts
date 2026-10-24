import { defaultDecision } from './decision';
import * as search from './search';
import * as heuristic from './heuristic';
import { createGame } from '../engine';
import { buildObservation } from './observation';

afterEach(() => {jest.restoreAllMocks();jest.useRealTimers();});
test.each(['hard','expert'] as const)('%s dispatch shared by computers and hints preserves 180ms pacing', async difficulty => {
  jest.useFakeTimers();
  const obs = {...buildObservation(createGame({startingSeat:0}),0),phase:'playing' as const};
  const choose = jest.spyOn(search,difficulty === 'hard' ? 'chooseHardAction' : 'chooseExpertAction').mockResolvedValue({action:null,status:'budget',diagnostics:{samples:0,simulatedNodes:0,workUnits:0,candidateCount:0,yields:0,elapsedMs:0,maxSliceMs:0}});
  const options = {difficulty,random:()=>.5,signal:{aborted:false}};
  const decision = defaultDecision(obs,options);
  await jest.advanceTimersByTimeAsync(179); expect(choose).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1); await decision; expect(choose).toHaveBeenCalledWith(obs,options);
});
test('expert bidding stays heuristic and cancellation during pacing skips all policies', async () => {
  jest.useFakeTimers();
  const obs = buildObservation(createGame({startingSeat:0}),0);
  const choose = jest.spyOn(heuristic,'chooseAction');
  const options = {difficulty:'expert' as const,random:()=>.5,signal:{aborted:false}};
  const bid = defaultDecision(obs,options); await jest.advanceTimersByTimeAsync(180); await bid;
  expect(choose).toHaveBeenCalledTimes(1);
  const cancelled = defaultDecision(obs,options); options.signal.aborted=true;
  await jest.advanceTimersByTimeAsync(180); expect(await cancelled).toBeNull(); expect(choose).toHaveBeenCalledTimes(1);
});
