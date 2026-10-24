import { Action, Difficulty, GameState, InitialDeal, Seat } from './types';
import { createDeck, shuffleDeck, sortCards } from './cards';
import { chooseCombo, generatePlays } from './rules';
export interface CreateGameOptions { random?: () => number; startingSeat?: Seat; difficulty?: Difficulty; gameId?: string; dealId?: string; initialRevision?: number; initialDeal?: InitialDeal }
export interface ActionResult { ok: boolean; state: GameState; reason?: string }
export const RULES_VERSION = 1;
const nextSeat = (seat: Seat): Seat => ((seat + 1) % 3) as Seat;
function copyDeal(deal: InitialDeal): InitialDeal {
  return { hands: deal.hands.map(h => h.map(c => ({...c}))) as InitialDeal['hands'], bottomCards: deal.bottomCards.map(c => ({...c})), startingSeat: deal.startingSeat };
}
function checkDeal(deal: InitialDeal) {
  const physical = [...deal.hands.flat(),...deal.bottomCards], canonical = new Map(createDeck().map(c => [c.id,c.rank]));
  if (![0,1,2].includes(deal.startingSeat) || deal.hands.length !== 3 || deal.hands.some(h => h.length !== 17) || deal.bottomCards.length !== 3 || physical.length !== 54 || new Set(physical.map(c => c.id)).size !== 54 || physical.some(c => canonical.get(c.id) !== c.rank)) throw new Error('初始发牌必须是54张唯一实体牌及17/17/17＋3结构');
}
export function createGame(options: CreateGameOptions = {}): GameState {
  const random = options.random ?? Math.random;
  let initialDeal: InitialDeal;
  if (options.initialDeal) { checkDeal(options.initialDeal); initialDeal = copyDeal(options.initialDeal); }
  else {
    const startingSeat = options.startingSeat ?? Math.floor(random() * 3) as Seat;
    const deck = shuffleDeck(createDeck(),random);
    initialDeal = { hands: [sortCards(deck.slice(0,17)),sortCards(deck.slice(17,34)),sortCards(deck.slice(34,51))], bottomCards: deck.slice(51), startingSeat };
    checkDeal(initialDeal);
  }
  const revision = options.initialRevision ?? 0;
  if (!Number.isInteger(revision) || revision < 0) throw new Error('初始回合版本无效');
  const gameId = options.gameId ?? `game-${Math.floor(random()*Number.MAX_SAFE_INTEGER).toString(36)}`;
  const dealId = options.dealId ?? `${gameId}:${revision}`;
  return {gameId,dealId,revision,initialRevision:revision,rulesVersion:RULES_VERSION,difficulty:options.difficulty ?? 'normal',phase:'calling',currentSeat:initialDeal.startingSeat,
    initialDeal,hands:copyDeal(initialDeal).hands,bottomCards:[...initialDeal.bottomCards],publicBottomCards:[],
    bidding:{declined:[],firstCaller:null,lastBidder:null,queue:[],hadGrab:false},landlord:null,target:null,targetCards:[],lastPlayer:null,passCount:0,history:[],winner:null};
}
function token(state: GameState, type: Action['type'], cardIds?: string[]): Action {
  return {type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision,...(cardIds ? {cardIds} : {})};
}
export function getLegalActions(state: GameState, seat: Seat = state.currentSeat): Action[] {
  if (seat !== state.currentSeat || state.phase === 'finished') return [];
  if (state.phase === 'calling') return [token(state,'call'),token(state,'declineCall')];
  if (state.phase === 'grabbing') return [token(state,'grab'),token(state,'declineGrab')];
  const actions = generatePlays(state.hands[seat],state.target).map(p => token(state,'play',p.cards.map(c => c.id)));
  return state.target ? [...actions,token(state,'pass')] : actions;
}
function makeLandlord(state: GameState, seat: Seat): GameState {
  const hands = state.hands.map((h,s) => s === seat ? sortCards([...h,...state.bottomCards]) : h) as GameState['hands'];
  return {...state,hands,landlord:seat,phase:'playing',currentSeat:seat,publicBottomCards:[...state.bottomCards],bidding:{...state.bidding,queue:[]}};
}
export function applyAction(state: GameState, action: Action, options: { random?: () => number } = {}): ActionResult {
  const reject = (reason: string): ActionResult => ({ok:false,state,reason});
  if (action.gameId !== state.gameId || action.dealId !== state.dealId || action.revision !== state.revision) return reject('回合已变化，请重新操作');
  if (state.phase === 'finished') return reject('本局已经结束');
  if (action.seat !== state.currentSeat) return reject('还没有轮到你');
  if (action.cardIds !== undefined && action.type !== 'play') return reject('这个操作不能选择牌');
  const validTypes = state.phase === 'calling' ? ['call','declineCall'] : state.phase === 'grabbing' ? ['grab','declineGrab'] : ['play','pass'];
  if (!validTypes.includes(action.type)) return reject('当前阶段不能执行这个操作');
  const historyAction = {...action,...(action.cardIds ? {cardIds:[...action.cardIds]} : {})};
  let updated: GameState = {...state,revision:state.revision+1,history:[...state.history,{action:historyAction}],bidding:{...state.bidding,declined:[...state.bidding.declined],queue:[...state.bidding.queue]}};
  if (state.phase === 'calling') {
    if (action.type === 'declineCall') {
      updated.bidding.declined.push(action.seat);
      if (updated.bidding.declined.length === 3) {
        updated = createGame({random:options.random,startingSeat:nextSeat(state.initialDeal.startingSeat),difficulty:state.difficulty,gameId:state.gameId,dealId:`${state.gameId}:${updated.revision}`,initialRevision:updated.revision});
      } else updated.currentSeat = nextSeat(action.seat);
    } else {
      const queue: Seat[] = [nextSeat(action.seat),nextSeat(nextSeat(action.seat))].filter(s => !state.bidding.declined.includes(s));
      updated.bidding = {...updated.bidding,firstCaller:action.seat,lastBidder:action.seat,queue};
      if (!queue.length) updated = makeLandlord(updated,action.seat);
      else {updated.phase = 'grabbing';updated.currentSeat = queue[0];}
    }
    return {ok:true,state:updated};
  }
  if (state.phase === 'grabbing') {
    if (action.type === 'grab') { updated.bidding.lastBidder = action.seat; updated.bidding.hadGrab = true; }
    updated.bidding.queue.shift();
    if (!updated.bidding.queue.length && updated.bidding.hadGrab && action.seat !== state.bidding.firstCaller) updated.bidding.queue.push(state.bidding.firstCaller!);
    if (!updated.bidding.queue.length) updated = makeLandlord(updated,updated.bidding.lastBidder!);
    else updated.currentSeat = updated.bidding.queue[0];
    return {ok:true,state:updated};
  }
  if (action.type === 'pass') {
    if (!state.target || state.lastPlayer === null) return reject('领出时必须出牌');
    updated.passCount = state.passCount + 1;
    if (updated.passCount === 2) {
      updated.target = null; updated.targetCards = []; updated.passCount = 0; updated.currentSeat = state.lastPlayer;
    } else updated.currentSeat = nextSeat(action.seat);
    return {ok:true,state:updated};
  }
  const ids = action.cardIds;
  if (!ids?.length) return reject('请先选择要出的牌');
  if (new Set(ids).size !== ids.length) return reject('同一张牌不能重复选择');
  const hand = state.hands[action.seat], owned = new Map(hand.map(c => [c.id,c]));
  if (ids.some(id => !owned.has(id))) return reject('只能打出自己手中的牌');
  const selected = sortCards(ids.map(id => owned.get(id)!));
  const combo = chooseCombo(selected,state.target);
  if (!combo) return reject(state.target ? '所选牌型无法压过当前牌' : '所选牌不构成有效牌型');
  updated.hands = state.hands.map((h,s) => s === action.seat ? h.filter(c => !ids.includes(c.id)) : h) as GameState['hands'];
  updated.target = combo; updated.targetCards = selected; updated.lastPlayer = action.seat; updated.passCount = 0;
  updated.history[updated.history.length-1] = {action:historyAction,combo};
  if (!updated.hands[action.seat].length) {
    const landlordWins = action.seat === state.landlord;
    const seats: Seat[] = landlordWins ? [action.seat] : ([0,1,2] as Seat[]).filter(s => s !== state.landlord);
    updated.phase = 'finished'; updated.winner = {team:landlordWins ? 'landlord' : 'farmers',seats,humanWon:seats.includes(0)};
  } else updated.currentSeat = nextSeat(action.seat);
  return {ok:true,state:updated};
}
