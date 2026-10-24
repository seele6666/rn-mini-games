import { Action, Card, Difficulty, PlayerObservation, Seat } from '../types';
import { chooseCombo, generatePlays } from '../rules';
import { createDeck } from '../cards';

export interface RankedAction { action: Action; score: number; reasons: { immediateWin: boolean; remainingTurns: number; splitCost: number; controlCost: number; teamSupport: number; threat: number } }
const cloneAction = (action: Action): Action => ({...action,...(action.cardIds ? {cardIds:[...action.cardIds]} : {})});
function rankCounts(cards: readonly Card[]): Map<number,number> {
  const counts = new Map<number,number>();
  for (const card of cards) counts.set(card.rank,(counts.get(card.rank) ?? 0)+1);
  return counts;
}

/** Greedy grouping estimates turns without generating another candidate tree. */
function estimatedTurns(cards: readonly Card[]): number {
  if (chooseCombo(cards)) return 1;
  const counts = rankCounts(cards);
  let turns = 0;
  if (counts.has(16) && counts.has(17)) { counts.delete(16); counts.delete(17); turns++; }
  for (const [copies,minimum] of [[3,2],[2,3],[1,5]]) {
    for (let start = 3; start <= 14; start++) {
      let end = start;
      while (end <= 14 && (counts.get(end) ?? 0) >= copies) end++;
      if (end-start < minimum) continue;
      for (let rank = start; rank < end; rank++) counts.set(rank,counts.get(rank)!-copies);
      turns++; start = end-1;
    }
  }
  const groups = [...counts.values()].filter(count => count > 0);
  const triples = groups.filter(count => count === 3).length;
  const wings = groups.filter(count => count === 1 || count === 2).length;
  return turns + groups.length - Math.min(triples,wings);
}

function structureCost(hand: readonly Card[], selected: readonly Card[]): number {
  const original = rankCounts(hand), used = rankCounts(selected);
  let cost = 0;
  for (const [rank,count] of used) {
    const before = original.get(rank)!;
    if (before > count) cost += before === 4 ? 18 : before >= 2 ? 6 : 0;
  }
  for (const [copies,minimum] of [[3,2],[2,3],[1,5]]) {
    for (let start = 3; start <= 14; start++) {
      let end = start;
      while (end <= 14 && (original.get(end) ?? 0) >= copies) end++;
      if (end-start < minimum) continue;
      const ranks = Array.from({length:end-start},(_,i) => start+i);
      const touched = ranks.some(rank => (used.get(rank) ?? 0) > 0);
      const intact = ranks.every(rank => (original.get(rank)!-(used.get(rank) ?? 0)) >= copies);
      const removed = ranks.every(rank => (used.get(rank) ?? 0) >= copies);
      if (touched && !intact && !removed) cost += 12;
      start = end-1;
    }
  }
  return cost;
}

/** Normal scores use only public roles, counts and turn order; lower is better. */
export function rankActions(observation: PlayerObservation, actions?: Action[]): RankedAction[] {
  if (observation.phase !== 'playing' || observation.currentSeat !== observation.seat) return [];
  const landlord = observation.landlord;
  const teammate = landlord === null || landlord === observation.seat ? null : ([0,1,2] as Seat[]).find(seat => seat !== landlord && seat !== observation.seat)!;
  const opponents = ([0,1,2] as Seat[]).filter(seat => seat !== observation.seat && (landlord === observation.seat || seat === landlord));
  const enemySingle = opponents.some(seat => observation.remainingCounts[seat] === 1);
  const nextSeat = ((observation.seat+1)%3) as Seat;
  const landlordThreat = landlord !== null && observation.remainingCounts[landlord] <= Math.max(1,observation.targetCards.length);
  const currentTurns = estimatedTurns(observation.hand);
  const handCounts = rankCounts(observation.hand);
  const accounted = new Set(observation.hand.map(card => card.id));
  for (const entry of observation.history) if (entry.action.type === 'play') {
    for (const id of entry.action.cardIds ?? []) accounted.add(id);
  }
  const highestUnseen = Math.max(0,...createDeck().filter(card => !accounted.has(card.id)).map(card => card.rank));
  const rows = (actions ?? ownActions(observation)).map(action => {
    const ids = new Set(action.cardIds), selected = observation.hand.filter(card => ids.has(card.id));
    const remaining = observation.hand.filter(card => !ids.has(card.id));
    const combo = action.type === 'play' ? chooseCombo(selected,observation.target) : null;
    const immediateWin = action.type === 'play' && selected.length === observation.hand.length;
    const remainingTurns = estimatedTurns(remaining), splitCost = structureCost(observation.hand,selected);
    const controlCost = combo ? Math.max(0,combo.bodyRank-10)*.65 + (combo.kind === 'bomb' ? 12 : combo.kind === 'rocket' ? 18 : 0) : 0;
    let teamSupport = 0, threat = 0;
    if (teammate !== null && observation.lastPlayer === teammate && observation.remainingCounts[teammate] <= 2 && !landlordThreat) teamSupport = action.type === 'pass' ? -100 : 50;
    if (teammate === nextSeat && observation.remainingCounts[teammate!] === 1 && !observation.target && combo?.kind === 'single') teamSupport -= (18-combo.bodyRank)*8;
    if (enemySingle) {
      if (action.type === 'pass') threat = 200;
      else if (combo?.kind === 'single') threat = (17-combo.bodyRank)*15;
    }
    // The greedy grouping estimate is a tie breaker: its incomplete treatment of
    // wings must not outweigh shedding cards or make taking control unaffordable.
    // Beating every unseen single can save the rest of a bomb for later.
    // Passing history never proves absence; only actual public plays count.
    const safeControl = observation.target && combo?.kind === 'single' && handCounts.get(combo.bodyRank) === 4 && combo.bodyRank >= highestUnseen ? -12 : 0;
    // A legal final combination is concrete evidence that splitting structures
    // leaves a short plan; do not charge the extra preservation penalty on lead.
    const preserveCost = !observation.target && remainingTurns === 1 ? 0 : splitCost*.6;
    const score = immediateWin ? -100000 : easyScore(observation,action) + (remainingTurns-currentTurns)*.5 + preserveCost + controlCost*.15 + teamSupport + threat + safeControl;
    return {action:cloneAction(action),score,reasons:{immediateWin,remainingTurns,splitCost,controlCost,teamSupport,threat}};
  });
  const key = (action: Action) => `${action.type}:${[...(action.cardIds ?? [])].sort().join('|')}`;
  return rows.sort((a,b) => a.score-b.score || key(a.action).localeCompare(key(b.action)));
}

/** Human hints return an action for confirmation, without an engine submission. */
export function suggestAction(observation: PlayerObservation, options: { random?: () => number; difficulty?: Difficulty } = {}): Action | null {
  if (observation.seat !== 0 || observation.currentSeat !== 0 || observation.phase !== 'playing') return null;
  return chooseAction(observation,options);
}

function ownActions(observation: PlayerObservation): Action[] {
  if (observation.legalActions) return observation.legalActions;
  const token = (type: Action['type'], cardIds?: string[]): Action => ({type,seat:observation.seat,gameId:observation.gameId,dealId:observation.dealId,revision:observation.revision,...(cardIds ? {cardIds} : {})});
  if (observation.phase === 'calling') return [token('call'),token('declineCall')];
  if (observation.phase === 'grabbing') return [token('grab'),token('declineGrab')];
  const plays = generatePlays(observation.hand,observation.target).map(play => token('play',play.cards.map(card => card.id)));
  return observation.target ? [...plays,token('pass')] : plays;
}

function handStrength(observation: PlayerObservation): number {
  const counts = new Map<number,number>();
  for (const card of observation.hand) counts.set(card.rank,(counts.get(card.rank) ?? 0)+1);
  let strength = 0;
  for (const [rank,count] of counts) {
    strength += Math.max(0,rank-13)*count;
    if (count === 4) strength += 6;
    else if (count === 3) strength += 2;
  }
  if (counts.has(16) && counts.has(17)) strength += 5;
  return strength;
}

function easyScore(observation: PlayerObservation, action: Action): number {
  if (action.type === 'pass') return 30;
  const ids = new Set(action.cardIds), selected = observation.hand.filter(card => ids.has(card.id));
  const combo = chooseCombo(selected,observation.target);
  if (!combo) return Infinity;
  const remaining = observation.hand.filter(card => !ids.has(card.id));
  const splitRanks = new Set(selected.filter(card => remaining.some(other => other.rank === card.rank)).map(card => card.rank));
  const powerCost = combo.kind === 'rocket' ? 16 : combo.kind === 'bomb' ? 12 : 0;
  return combo.bodyRank - selected.length*1.5 + splitRanks.size*4 + powerCost;
}

/** Hard dispatch uses the normal fallback here; budgeted search lives separately. */
export function chooseAction(observation: PlayerObservation, options: { random?: () => number; difficulty?: Difficulty } = {}): Action | null {
  if (observation.phase === 'finished' || observation.currentSeat !== observation.seat) return null;
  const actions = ownActions(observation);
  if (!actions.length) return null;
  let chosen: Action;
  const random = options.random ?? Math.random;
  if (observation.phase === 'calling' || observation.phase === 'grabbing') {
    const willing = handStrength(observation) >= 8 || random() < .12;
    const type = observation.phase === 'calling' ? (willing ? 'call' : 'declineCall') : (willing ? 'grab' : 'declineGrab');
    chosen = actions.find(action => action.type === type) ?? actions[0];
  } else {
    if (options.difficulty === 'normal' || options.difficulty === 'hard' || options.difficulty === 'expert') return rankActions(observation,actions)[0]?.action ?? null;
    const ranked = actions.map(action => ({action,score:easyScore(observation,action)})).sort((a,b) => a.score-b.score);
    const reasonable = ranked.filter(candidate => candidate.score <= ranked[0].score+3).slice(0,3);
    // Usually keep the best small intact combination; occasionally vary a close choice.
    chosen = random() < .15 && reasonable.length > 1 ? reasonable[1].action : ranked[0].action;
  }
  return cloneAction(chosen);
}
