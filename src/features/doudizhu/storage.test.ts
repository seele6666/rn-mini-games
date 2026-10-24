import { createGameStorage, SAVE_KEY, StorageAdapter } from './storage';
import { createSeededRandom } from './cards';
import { applyAction, createGame } from './engine';
import { Action, GameState } from './types';

function step(state: GameState, type: Action['type'], cardIds?: string[]) {
  const result = applyAction(state,{ type, cardIds, seat:state.currentSeat, gameId:state.gameId, dealId:state.dealId, revision:state.revision },{random:createSeededRandom(92)});
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}
function stages() {
  const calling = createGame({startingSeat:0,random:createSeededRandom(8),gameId:'storage'});
  const grabbing = step(calling,'call');
  const playing = step(step(grabbing,'declineGrab'),'declineGrab');
  let finished = playing;
  while (finished.phase !== 'finished') {
    finished = step(finished,'play',[finished.hands[0][0].id]);
    if (finished.phase !== 'finished') finished = step(step(finished,'pass'),'pass');
  }
  return {calling,grabbing,playing,finished};
}
function memory(raw: string | null = null) {
  const values = new Map<string,string>([['game2048.save.v1','2048 untouched']]);
  if (raw !== null) values.set(SAVE_KEY,raw);
  const adapter: StorageAdapter = { getItem: async key => values.get(key) ?? null, setItem: async (key,value) => {values.set(key,value);} };
  return {adapter,values};
}
const envelope = (state: GameState) => ({version:1,rulesVersion:1,state});

test.each(['easy','normal','hard','expert'] as const)('%s difficulty restores with unchanged v1 format', async difficulty => {
  const state = createGame({difficulty,startingSeat:0,random:createSeededRandom(8),gameId:'compatibility'});
  const storage = createGameStorage(memory(JSON.stringify(envelope(state))).adapter);
  expect(await storage.loadGame()).toEqual({status:'valid',state});
});

test.each(Object.entries(stages()))('%s round trips with its complete replayable state',async (_phase,state) => {
  const {adapter,values} = memory(); const storage = createGameStorage(adapter);
  await storage.saveGame(state);
  expect(await storage.loadGame()).toEqual({status:'valid',state});
  expect(values.get('game2048.save.v1')).toBe('2048 untouched');
  expect(values.get('doudizhu.save.v1')).toBeDefined();
});
test('redealt history starts at its nonzero global revision',async () => {
  let state = stages().calling;
  for (let i=0;i<3;i++) state = step(state,'declineCall');
  state = step(state,'call');
  expect(state.initialRevision).toBe(3); expect(state.revision).toBe(4);
  const storage = createGameStorage(memory(JSON.stringify(envelope(state))).adapter);
  expect(await storage.loadGame()).toEqual({status:'valid',state});
});
test('missing and failed reads have distinct outcomes',async () => {
  expect(await createGameStorage(memory().adapter).loadGame()).toEqual({status:'missing'});
  const adapter = {...memory().adapter,getItem:async () => {throw new Error('disk');}};
  expect(await createGameStorage(adapter).loadGame()).toEqual({status:'readError'});
});
test('valid JSON object key order does not affect recovery',async () => {
  const state = stages().playing;
  const reversed = JSON.parse(JSON.stringify(envelope(state)),(_key,value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value);
  expect(await createGameStorage(memory(JSON.stringify(reversed)).adapter).loadGame()).toEqual({status:'valid',state});
});
const mutations: [string,(data: ReturnType<typeof envelope>) => void][] = [
  ['format version',data => {data.version=2;}],
  ['rules version',data => {data.rulesVersion=2;}],
  ['duplicate initial card',data => {data.state.initialDeal.hands[0][1]=data.state.initialDeal.hands[0][0];}],
  ['wrong suit',data => {data.state.initialDeal.hands[0][0].suit='wrong';}],
  ['missing suit',data => {delete data.state.initialDeal.hands[0][0].suit;}],
  ['extra card field',data => {Object.assign(data.state.initialDeal.hands[0][0],{extra:true});}],
  ['wrong rank',data => {data.state.hands[0][0].rank=17;}],
  ['history action',data => {data.state.history[0].action.type='declineCall';}],
  ['old action revision',data => {data.state.history[1].action.revision=0;}],
  ['role',data => {data.state.landlord=1;}],
  ['target',data => {data.state.target={kind:'single',bodyLength:1,bodyRank:3,wing:'none'};}],
  ['winner',data => {data.state.winner={team:'farmers',seats:[1,2],humanWon:false};}],
  ['unsafe revision',data => {data.state.revision=Number.MAX_SAFE_INTEGER+1;}],
  ['difficulty',data => {Object.assign(data.state,{difficulty:'unknown'});}],
  ['null hand',data => {Object.assign(data.state.initialDeal,{hands:null});}],
  ['unbounded history',data => {data.state.history=Array(1001).fill(data.state.history[0]);}],
];
test.each(mutations)('rejects %s without partially recovering',async (_name,mutate) => {
  const data = envelope(stages().playing); mutate(data);
  expect(await createGameStorage(memory(JSON.stringify(data)).adapter).loadGame()).toEqual({status:'invalid'});
});
test('replay validates the normalized combination, not just the action cards',async () => {
  let state=stages().playing; state=step(state,'play',[state.hands[0][0].id]);
  state.history[state.history.length-1].combo!.bodyRank++;
  expect(await createGameStorage(memory(JSON.stringify(envelope(state))).adapter).loadGame()).toEqual({status:'invalid'});
});
test.each(['{bad','null','[]','x'.repeat(1_000_001)])('rejects malformed or excessive raw input',async raw => {
  expect(await createGameStorage(memory(raw).adapter).loadGame()).toEqual({status:'invalid'});
});
test('write failures reach the caller while leaving other games untouched',async () => {
  const {adapter,values}=memory();
  const storage=createGameStorage({...adapter,setItem:async () => {throw new Error('full');}});
  await expect(storage.saveGame(stages().calling)).rejects.toThrow('full');
  expect(values.get('game2048.save.v1')).toBe('2048 untouched');
});
