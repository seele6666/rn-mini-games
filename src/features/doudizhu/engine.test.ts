import { createSeededRandom } from './cards';
import { applyAction, createGame, getLegalActions } from './engine';
import { Action, ActionType, GameState, Seat } from './types';
function act(state: GameState, type: ActionType): Action {
  return { type, seat: state.currentSeat, gameId: state.gameId, dealId: state.dealId, revision: state.revision };
}
function step(state: GameState, type: ActionType): GameState {
  const result = applyAction(state,act(state,type),{random:createSeededRandom(99)});
  expect(result.ok).toBe(true); return result.state;
}
function conservation(state: GameState) {
  const played = state.history.filter(h => h.action.type === 'play').flatMap(h => h.action.cardIds ?? []);
  const ids = [...state.hands.flat().map(c => c.id),...played,...(state.landlord === null ? state.bottomCards.map(c => c.id) : [])];
  expect(ids).toHaveLength(54); expect(new Set(ids).size).toBe(54);
}
describe('dealing and finite bidding', () => {
  test.each([0,1,2] as Seat[])('deals 17/17/17 plus three hidden cards with starting seat %s', startingSeat => {
    const state = createGame({random:createSeededRandom(7),startingSeat,gameId:'fixture'});
    expect(state.phase).toBe('calling'); expect(state.currentSeat).toBe(startingSeat);
    expect(state.hands.map(h => h.length)).toEqual([17,17,17]); expect(state.bottomCards).toHaveLength(3);
    expect(state.publicBottomCards).toEqual([]); expect(state.landlord).toBeNull(); conservation(state);
    expect(getLegalActions(state).map(a => a.type)).toEqual(['call','declineCall']);
    expect(getLegalActions(state,((startingSeat+1)%3) as Seat)).toEqual([]);
  });
  test.each([0,1,2] as Seat[])('nobody grabbing leaves starting caller %s landlord exactly once', startingSeat => {
    let state = createGame({random:createSeededRandom(2),startingSeat});
    const originalBottom = state.bottomCards;
    state = step(state,'call'); state = step(state,'declineGrab');
    const finalAction = act(state,'declineGrab');
    state = applyAction(state,finalAction).state;
    expect(state.phase).toBe('playing'); expect(state.landlord).toBe(startingSeat);
    expect(state.currentSeat).toBe(startingSeat); expect(state.hands[startingSeat]).toHaveLength(20);
    expect(state.publicBottomCards).toEqual(originalBottom); conservation(state);
    const duplicate = applyAction(state,finalAction);
    expect(duplicate.ok).toBe(false); expect(duplicate.state).toBe(state); conservation(duplicate.state);
  });
  test('previous declines cannot grab and caller gets one final countergrab', () => {
    let state = createGame({startingSeat:0,random:createSeededRandom(3)});
    state = step(state,'declineCall'); state = step(state,'call');
    expect(state.currentSeat).toBe(2); expect(state.bidding.queue).toEqual([2]);
    state = step(state,'grab'); expect(state.currentSeat).toBe(1);
    expect(state.bidding.queue).toEqual([1]);
    state = step(state,'grab'); expect(state.landlord).toBe(1); expect(state.phase).toBe('playing'); conservation(state);
  });
  test('last other grabber wins when initial caller declines the final chance', () => {
    let state = createGame({startingSeat:0,random:createSeededRandom(5)});
    for (const type of ['call','grab','grab','declineGrab'] as ActionType[]) state = step(state,type);
    expect(state.landlord).toBe(2); expect(state.phase).toBe('playing');
    expect(state.history).toHaveLength(4); conservation(state);
  });
  test('two early declines skip grabbing completely', () => {
    let state = createGame({startingSeat:0,random:createSeededRandom(5)});
    state = step(state,'declineCall'); state = step(state,'declineCall'); state = step(state,'call');
    expect(state.phase).toBe('playing'); expect(state.landlord).toBe(2); conservation(state);
  });
  test('all declines redeal, rotate caller, clear decisions and preserve global revision baseline', () => {
    let state = createGame({startingSeat:2,random:createSeededRandom(5),gameId:'same-session'});
    const first = state;
    for (let i=0;i<3;i++) state = step(state,'declineCall');
    expect(state.gameId).toBe(first.gameId); expect(state.dealId).not.toBe(first.dealId);
    expect(state.phase).toBe('calling'); expect(state.currentSeat).toBe(0);
    expect(state.history).toEqual([]); expect(state.bidding.declined).toEqual([]);
    expect(state.revision).toBe(3); expect(state.initialRevision).toBe(3);
    expect(state.hands).not.toEqual(first.hands); expect(state.publicBottomCards).toEqual([]); conservation(state);
    const restored = createGame({gameId:state.gameId,dealId:state.dealId,difficulty:state.difficulty,initialDeal:state.initialDeal,initialRevision:state.initialRevision});
    expect(restored).toEqual(state);
  });
  test('wrong turn, wrong phase and stale identifiers preserve state and history', () => {
    const state = createGame({startingSeat:0,random:createSeededRandom(2)});
    for (const action of [{...act(state,'call'),seat:1 as Seat},{...act(state,'call'),revision:99}, {...act(state,'call'),gameId:'old'},{...act(state,'call'),dealId:'old'},act(state,'grab')]) {
      const result = applyAction(state,action);
      expect(result.ok).toBe(false); expect(result.reason).toBeTruthy(); expect(result.state).toBe(state);
    }
  });
});
describe('legal turns and team results', () => {
  function playing(): GameState {
    let state = createGame({startingSeat:0,random:createSeededRandom(20),gameId:'turn-tests'});
    for (const type of ['call','declineGrab','declineGrab'] as ActionType[]) state = step(state,type);
    return state;
  }
  function play(state: GameState, cardIds: string[]) { return applyAction(state,{...act(state,'play'),cardIds}); }
  test('valid play removes only owned IDs, records normalized shape and advances once', () => {
    const before = playing(); const card = before.hands[0][0];
    const result = play(before,[card.id]); expect(result.ok).toBe(true);
    const after = result.state;
    expect(after.hands[0]).toHaveLength(19); expect(before.hands[0]).toHaveLength(20);
    expect(after.currentSeat).toBe(1); expect(after.revision).toBe(before.revision+1);
    expect(after.target).toEqual({kind:'single',bodyLength:1,bodyRank:card.rank,wing:'none'});
    expect(after.targetCards).toEqual([card]); expect(after.history[3].combo).toEqual(after.target); conservation(after);
  });
  test('two passes clear target and return lead to last successful player', () => {
    const before = playing(); let state = play(before,[before.hands[0][0].id]).state;
    state = step(state,'pass'); expect(state.passCount).toBe(1); expect(state.currentSeat).toBe(2);
    state = step(state,'pass'); expect(state.passCount).toBe(0); expect(state.target).toBeNull();
    expect(state.targetCards).toEqual([]); expect(state.currentSeat).toBe(0);
    expect(getLegalActions(state).some(a => a.type === 'pass')).toBe(false);
    const rejected = applyAction(state,act(state,'pass')); expect(rejected.ok).toBe(false); expect(rejected.state).toBe(state);
  });
  test('invalid card rights, repeats, empty sets and malformed combinations leave all state unchanged', () => {
    const state = playing(); const owned = state.hands[0];
    const invalid = [[state.hands[1][0].id],[owned[0].id,owned[0].id],[],['missing'],[owned[0].id,owned.find(c => c.rank !== owned[0].rank)!.id]];
    for (const ids of invalid) {
      const frozenBefore = JSON.stringify(state); const result = play(state,ids);
      expect(result.ok).toBe(false); expect(result.reason).toBeTruthy(); expect(result.state).toBe(state); expect(JSON.stringify(state)).toBe(frozenBefore);
    }
  });
  test('a smaller follow and a repeat of the previous revision cannot change the trick', () => {
    const before = playing(); const high = before.hands[0][before.hands[0].length-1];
    const action = {...act(before,'play'),cardIds:[high.id]};
    const state = applyAction(before,action).state;
    const low = state.hands[1].find(c => c.rank <= high.rank)!;
    expect(play(state,[low.id]).ok).toBe(false);
    const old = applyAction(state,action); expect(old.ok).toBe(false); expect(old.state).toBe(state);
  });
  test.each([0,1,2] as Seat[])('seat %s going out awards its entire team and stops further actions', seat => {
    const original = playing();
    // A controlled terminal fixture isolates turn/result behavior. Full-deck
    // conservation is covered by real games below, rather than this small hand.
    const state: GameState = {...original,currentSeat:seat,hands:original.hands.map((h,s) => s === seat ? [h[0]] : h) as GameState['hands']};
    const result = play(state,[state.hands[seat][0].id]); expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('finished'); expect(result.state.currentSeat).toBe(seat);
    expect(result.state.winner).toEqual(seat === 0 ? {team:'landlord',seats:[0],humanWon:true} : {team:'farmers',seats:[1,2],humanWon:false});
    expect(getLegalActions(result.state)).toEqual([]);
    expect(applyAction(result.state,act(result.state,'pass'))).toMatchObject({ok:false,state:result.state});
  });
  test('human farmer shares teammate victory while holding cards', () => {
    let state = createGame({startingSeat:1,random:createSeededRandom(20)});
    for (const type of ['call','declineGrab','declineGrab'] as ActionType[]) state = step(state,type);
    state = {...state,currentSeat:2,hands:[state.hands[0],state.hands[1],[state.hands[2][0]]]};
    const result = play(state,[state.hands[2][0].id]);
    expect(result.state.winner).toEqual({team:'farmers',seats:[0,2],humanWon:true});
    expect(result.state.hands[0]).toHaveLength(17);
  });
  test('seeded legal trajectories preserve all 54 physical cards and replay exactly', () => {
    for (let seed=1;seed<=6;seed++) {
      const random = createSeededRandom(seed); let state = createGame({startingSeat:0,random,gameId:`trajectory-${seed}`});
      const initial = state;
      for (const type of ['call','declineGrab','declineGrab'] as ActionType[]) state = step(state,type);
      let turns = 0;
      while (state.phase !== 'finished' && turns++ < 300) {
        const legal = getLegalActions(state);
        expect(legal.length).toBeGreaterThan(0);
        const result = applyAction(state,legal[Math.floor(random()*legal.length)]);
        expect(result.ok).toBe(true); state = result.state; conservation(state);
      }
      expect(state.phase).toBe('finished');
      let replay = createGame({gameId:initial.gameId,dealId:initial.dealId,difficulty:initial.difficulty,initialDeal:initial.initialDeal,initialRevision:initial.initialRevision});
      for (const entry of state.history) replay = applyAction(replay,entry.action).state;
      expect(replay).toEqual(state);
    }
  });
});
