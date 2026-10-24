import { searchProfiles } from './profiles';
import { Action, Card, GameState, PlayerObservation, Seat } from '../types';
import { createDeck, sortCards } from '../cards';
import { applyAction, createGame } from '../engine';
import { iteratePlays } from '../rules';
import { buildObservation } from './observation';
import { chooseAction, rankActions, RankedAction } from './heuristic';
export interface SearchOptions {
  random?: () => number; clock?: () => number; yieldWork?: () => Promise<void>; signal?: {readonly aborted:boolean};
  nodeBudget?: number; timeBudgetMs?: number; sliceMs?: number; workBudget?: number;
  candidateLimit?: number; rolloutDepth?: number; sampleRounds?: number;
}
export interface SearchResult {
  action: Action | null; status:'complete'|'budget'|'cancelled'|'error'|'inactive';
  diagnostics: {samples:number;simulatedNodes:number;workUnits:number;candidateCount:number;yields:number;elapsedMs:number;maxSliceMs:number};
}
const token = (obs: PlayerObservation, type: Action['type'], cardIds?: string[]): Action => ({type,seat:obs.seat,gameId:obs.gameId,dealId:obs.dealId,revision:obs.revision,...(cardIds ? {cardIds} : {})});
const copyAction = (action: Action | null): Action | null => action ? {...action,...(action.cardIds ? {cardIds:[...action.cardIds]} : {})} : null;

/** Constant deck-size work, with no move-tree enumeration or policy RNG. */
function cheapFallback(obs: PlayerObservation): Action | null {
  if (obs.phase === 'finished' || obs.currentSeat !== obs.seat) return null;
  if (obs.phase !== 'playing') return chooseAction({...obs,legalActions:undefined},{difficulty:'normal',random:() => .9});
  if (obs.target) return token(obs,'pass');
  const lowest = sortCards(obs.hand)[0];
  return lowest ? token(obs,'play',[lowest.id]) : null;
}

/**
 * Construct a possible deal from the information set, then replay public actions.
 * Only this search layer sees the synthetic state; rollout policies see observations.
 * Every yield is bounded deck work or one engine transition.
 */
export function* sampleHiddenStateSteps(obs: PlayerObservation, random: () => number): Generator<null,GameState> {
  if (obs.phase !== 'playing' || obs.landlord === null) throw new Error('Sampling requires public landlord cards');
  const deck = createDeck(), canonical = new Map(deck.map(card => [card.id,card]));
  const played = new Set<string>(), playedBySeat: Card[][] = [[],[],[]];
  for (const entry of obs.history) {
    yield null;
    if (entry.action.type !== 'play') continue;
    for (const id of entry.action.cardIds ?? []) {
      const card = canonical.get(id);
      if (!card || played.has(id)) throw new Error('Invalid public card history');
      played.add(id); playedBySeat[entry.action.seat].push(card);
    }
  }
  const hands: [Card[],Card[],Card[]] = [[],[],[]];
  hands[obs.seat] = obs.hand.map(card => ({...card}));
  const fixed = new Set([...played,...obs.hand.map(card => card.id)]);
  for (const card of obs.publicBottomCards) {
    yield null;
    if (played.has(card.id)) continue;
    if (obs.seat !== obs.landlord) {
      if (fixed.has(card.id)) throw new Error('A visible bottom card belongs to the landlord');
      hands[obs.landlord].push({...card});
    } else if (!fixed.has(card.id)) throw new Error('Missing visible landlord card');
    fixed.add(card.id);
  }
  const pool = deck.filter(card => !fixed.has(card.id));
  for (let i = pool.length-1; i > 0; i--) {
    yield null;
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid policy random sample');
    const j = Math.floor(value*(i+1));
    [pool[i],pool[j]] = [pool[j],pool[i]];
  }
  let offset = 0;
  for (const seat of [0,1,2] as Seat[]) {
    yield null;
    if (seat !== obs.seat) {
      const needed = obs.remainingCounts[seat]-hands[seat].length;
      if (needed < 0) throw new Error('Inconsistent visible card counts');
      hands[seat].push(...pool.slice(offset,offset+needed)); offset += needed;
    }
    hands[seat] = sortCards(hands[seat]);
  }
  if (offset !== pool.length) throw new Error('Inconsistent unknown card pool');
  const bottomIds = new Set(obs.publicBottomCards.map(card => card.id));
  const initialHands = hands.map((hand,seat) => sortCards([...hand,...playedBySeat[seat]].filter(card => seat !== obs.landlord || !bottomIds.has(card.id)))) as [Card[],Card[],Card[]];
  yield null;
  let state = createGame({
    gameId:obs.gameId,dealId:obs.dealId,initialRevision:obs.revision-obs.history.length,difficulty:'hard',
    initialDeal:{hands:initialHands,bottomCards:obs.publicBottomCards.map(card => ({...card})),startingSeat:obs.history[0]?.action.seat ?? obs.currentSeat},
  });
  for (const entry of obs.history) {
    yield null;
    const result = applyAction(state,entry.action);
    if (!result.ok) throw new Error(`Sample cannot replay public history: ${result.reason}`);
    state = result.state;
  }
  return state;
}

class StopSearch extends Error {
  constructor(readonly status: 'budget'|'cancelled') { super(status); }
}

/** Unknown-hand sampling with cooperative scheduling across every search stage. */
export function chooseHardAction(observation: PlayerObservation, options: SearchOptions = {}): Promise<SearchResult> {
  return searchAction(observation, options, searchProfiles.hard);
}
export function chooseExpertAction(observation: PlayerObservation, options: SearchOptions = {}): Promise<SearchResult> {
  return searchAction(observation, options, searchProfiles.expert);
}
async function searchAction(observation: PlayerObservation, options: SearchOptions, profile: (typeof searchProfiles)[keyof typeof searchProfiles]): Promise<SearchResult> {
  const diagnostics: SearchResult['diagnostics'] = {samples:0,simulatedNodes:0,workUnits:0,candidateCount:0,yields:0,elapsedMs:0,maxSliceMs:0};
  let fallback: Action | null = null;
  if (options.signal?.aborted) return {action:null,status:'cancelled',diagnostics};
  if (observation.phase === 'finished' || observation.currentSeat !== observation.seat) return {action:null,status:'inactive',diagnostics};
  const clock = options.clock ?? Date.now, random = options.random ?? Math.random;
  const yieldWork = options.yieldWork ?? (() => new Promise<void>(resolve => setTimeout(resolve,0)));
  let start = 0, last = 0, sliceStart = 0, sliceWork = 0, started = false;
  try {
    start = last = sliceStart = clock(); started = true;
    if (!Number.isFinite(start)) throw new Error('Invalid search clock');
    fallback = cheapFallback(observation);
    const bound = (value: number | undefined, defaultValue: number) => {
      const result = value ?? defaultValue;
      if (!Number.isFinite(result) || result < 0) throw new Error('Invalid search budget');
      return result;
    };
    const nodeBudget = Math.min(profile.nodeBudget,Math.floor(bound(options.nodeBudget,profile.nodeBudget)));
    const timeBudget = Math.min(profile.timeBudgetMs,bound(options.timeBudgetMs,profile.timeBudgetMs)), sliceMs = Math.min(8,bound(options.sliceMs,8));
    const workBudget = Math.min(profile.workBudget,Math.floor(bound(options.workBudget,profile.workBudget)));
    const candidateLimit = Math.max(1,Math.min(profile.candidateLimit,Math.floor(bound(options.candidateLimit,profile.candidateLimit))));
    const rolloutDepth = Math.min(profile.rolloutDepth,Math.floor(bound(options.rolloutDepth,profile.rolloutDepth)));
    const rounds = Math.min(profile.sampleRounds,Math.floor(bound(options.sampleRounds,profile.sampleRounds)));

    function check() {
      if (options.signal?.aborted) throw new StopSearch('cancelled');
      const now = clock();
      if (!Number.isFinite(now) || now < last) throw new Error('Invalid search clock');
      last = now; diagnostics.elapsedMs = now-start;
      if (diagnostics.elapsedMs >= timeBudget || diagnostics.simulatedNodes >= nodeBudget || diagnostics.workUnits >= workBudget) throw new StopSearch('budget');
    }
    async function checkpoint() {
      check(); diagnostics.workUnits++; sliceWork++;
      const elapsedSlice = last-sliceStart;
      diagnostics.maxSliceMs = Math.max(diagnostics.maxSliceMs,elapsedSlice);
      if (elapsedSlice >= sliceMs || sliceWork >= 32) {
        diagnostics.yields++;
        await yieldWork();
        check(); sliceStart = last; sliceWork = 0;
      }
    }
    check();
    if (observation.phase !== 'playing') return {action:copyAction(fallback),status:'complete',diagnostics};

    async function candidates(obs: PlayerObservation, root: boolean): Promise<RankedAction[]> {
      const ranked: RankedAction[] = [];
      const keep = async (action: Action) => {
        await checkpoint();
        ranked.push(...rankActions(obs,[action]));
        ranked.sort((a,b) => a.score-b.score || a.action.cardIds?.join('|').localeCompare(b.action.cardIds?.join('|') ?? '') || a.action.type.localeCompare(b.action.type));
        ranked.length = Math.min(ranked.length,root ? candidateLimit : 1);
        if (root) fallback = copyAction(ranked[0]?.action ?? fallback);
      };
      if (obs.target) await keep(token(obs,'pass'));
      const iterator = iteratePlays(obs.hand,obs.target);
      let valid = 0;
      while (true) {
        await checkpoint();
        const step = iterator.next();
        if (step.done) break;
        if (step.value) {
          if (root) diagnostics.candidateCount++;
          await keep(token(obs,'play',step.value.cards.map(card => card.id)));
          valid++;
          // Rollout policies use a bounded representative prefix, scored normally.
          if (!root && valid >= 12) break;
        }
      }
      return ranked;
    }
    const rootCandidates = await candidates(observation,true);
    if (!rootCandidates.length) return {action:copyAction(fallback),status:'complete',diagnostics};
    const totals = rootCandidates.map(() => ({sum:0,count:0}));
    const rootLandlord = observation.seat === observation.landlord;
    let bestValue = -Infinity;
    for (let round = 0; round < rounds; round++) {
      const sampler = sampleHiddenStateSteps(observation,random);
      let sample: GameState;
      while (true) {
        await checkpoint();
        const step = sampler.next();
        if (step.done) {sample = step.value; break;}
      }
      diagnostics.samples++;
      for (let index = 0; index < rootCandidates.length; index++) {
        await checkpoint();
        let result = applyAction(sample,rootCandidates[index].action);
        if (!result.ok) throw new Error('Invalid root candidate in sampled state');
        diagnostics.simulatedNodes++;
        let simulated = result.state;
        for (let depth = 0; depth < rolloutDepth && simulated.phase !== 'finished'; depth++) {
          await checkpoint();
          // Never pass the synthetic full state to a policy or to rankActions.
          const view = buildObservation(simulated,simulated.currentSeat,{includeLegalActions:false});
          const choices = await candidates(view,false);
          const action = choices[0]?.action ?? cheapFallback(view);
          if (!action) throw new Error('Missing simulated legal action');
          await checkpoint();
          result = applyAction(simulated,action);
          if (!result.ok) throw new Error('Invalid rollout action');
          diagnostics.simulatedNodes++; simulated = result.state;
        }
        await checkpoint();
        let value: number;
        if (simulated.winner) value = (simulated.winner.team === 'landlord') === rootLandlord ? 1 : -1;
        else {
          const landlord = simulated.landlord!, farmers = ([0,1,2] as Seat[]).filter(seat => seat !== landlord);
          const landlordDistance = simulated.hands[landlord].length, farmerDistance = Math.min(...farmers.map(seat => simulated.hands[seat].length));
          const control = (seat: Seat) => simulated.hands[seat].filter(card => card.rank >= 15).length;
          const landlordControl = control(landlord), farmerControl = farmers.reduce<number>((sum,seat) => sum+control(seat),0);
          const landlordValue = (farmerDistance-landlordDistance)/20 + (landlordControl-farmerControl)/50;
          value = Math.max(-.9,Math.min(.9,rootLandlord ? landlordValue : -landlordValue));
        }
        totals[index].sum += value; totals[index].count++;
        // Recompute all means as additional samples can lower a former leader.
        bestValue = -Infinity;
        for (let candidate = 0; candidate < totals.length; candidate++) {
          if (!totals[candidate].count) continue;
          const mean = totals[candidate].sum/totals[candidate].count;
          if (mean > bestValue) {bestValue = mean; fallback = copyAction(rootCandidates[candidate].action);}
        }
      }
    }
    check();
    return {action:copyAction(fallback),status:'complete',diagnostics};
  } catch (error) {
    if (!fallback) fallback = cheapFallback(observation);
    if (started) diagnostics.elapsedMs = Math.max(0,last-start);
    const status = options.signal?.aborted ? 'cancelled' : error instanceof StopSearch ? error.status : 'error';
    return {action:status === 'cancelled' ? null : copyAction(fallback),status,diagnostics};
  }
}
