import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppStateStatus } from 'react-native';
import { createSeededRandom } from './cards';
import { applyAction, createGame } from './engine';
import { createSaveQueue, GameStorage } from './saveQueue';
import { LoadResult } from './storage';
import { Action, GameState, Seat } from './types';
import { Decision, SessionOptions, useDoudizhu } from './useDoudizhu';

function deferred<T>() { let resolve!: (value:T) => void; let reject!: (reason:unknown) => void; const promise = new Promise<T>((yes,no) => {resolve=yes;reject=no;}); return {promise,resolve,reject}; }
function lifecycle() {
  const handlers = new Set<(state:AppStateStatus) => void>();
  return {currentState:'active' as AppStateStatus,addEventListener:(_type:'change',handler:(state:AppStateStatus)=>void) => {handlers.add(handler);return {remove:()=>handlers.delete(handler)};},emit(state:AppStateStatus) {this.currentState=state;for(const handler of handlers) handler(state);}};
}
function action(state:GameState,type:Action['type'],cardIds?:string[]):Action {return {type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision,...(cardIds ? {cardIds} : {})};}
function playing(seat:Seat=0) {
  let state = createGame({startingSeat:seat,random:createSeededRandom(7),gameId:'session'});
  for(const type of ['call','declineGrab','declineGrab'] as const) state=applyAction(state,action(state,type)).state;
  return state;
}
function memory(initial:GameState|null) {
  let saved:LoadResult = initial ? {status:'valid',state:initial} : {status:'missing'};
  const writes:GameState[]=[];
  const storage:GameStorage={loadGame:async()=>saved,saveGame:async state=>{writes.push(state);saved={status:'valid',state};}};
  return {storage,writes};
}
function setup(storage:GameStorage,more:Partial<SessionOptions>={}) {
  const life=lifecycle(), pending=deferred<Action|null>();
  const options:SessionOptions={focused:true,storage,lifecycle:life,random:createSeededRandom(2),decide:()=>pending.promise,...more};
  return {life,pending,options};
}

test('loading blocks actions and waits for a saved game without exposing hidden hands',async()=>{
  const saved=playing(), load=deferred<LoadResult>(), mem=memory(saved);
  const {options}=setup({...mem.storage,loadGame:()=>load.promise});
  const hook=await renderHook(()=>useDoudizhu(options));
  await act(()=>hook.result.current.submit('call'));
  expect(hook.result.current.loading).toBe(true); expect(hook.result.current.state).toBeNull();
  await act(()=>load.resolve({status:'valid',state:saved}));
  expect(hook.result.current.state?.hand).toEqual(saved.hands[0]);
  expect(hook.result.current.state).not.toHaveProperty('hands');
  expect(mem.writes).toEqual([]);
});

test.each(['missing','invalid','readError'] as const)('%s restore offers a new game without overwriting the old file',async status=>{
  const mem=memory(null), {options}=setup({...mem.storage,loadGame:async()=>({status})});
  const hook=await renderHook(()=>useDoudizhu(options));
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.choosingDifficulty).toBe(true);
  expect(hook.result.current.restoreIssue).toBe(status==='missing'?null:status);
  expect(mem.writes).toEqual([]);
  await act(()=>hook.result.current.startNewGame('hard'));
  expect(hook.result.current.difficulty).toBe('hard');
  expect(mem.writes).toHaveLength(1);
});

test.each(['focus','background','unmount'] as const)('a late computer result after %s cannot advance or save',async pause=>{
  const saved=playing(1),mem=memory(saved),ctx=setup(mem.storage);
  let calls=0;ctx.options.decide=()=>{calls++;return ctx.pending.promise;};
  const hook=await renderHook<ReturnType<typeof useDoudizhu>,{focused:boolean}>(({focused})=>useDoudizhu({...ctx.options,focused}),{initialProps:{focused:true}});
  await waitFor(()=>expect(calls).toBe(1));
  if(pause==='focus') await hook.rerender({focused:false});
  if(pause==='background') await act(()=>ctx.life.emit('background'));
  if(pause==='unmount') await hook.unmount();
  await act(()=>ctx.pending.resolve(action(saved,'play',[saved.hands[1][0].id])));
  expect(mem.writes).toEqual([]);
  if(pause!=='unmount') expect(hook.result.current.state?.revision).toBe(saved.revision);
});

test('foreground repeats and rerenders start one task, and an old finally cannot erase the new task',async()=>{
  const saved=playing(1),mem=memory(saved),ctx=setup(mem.storage),old=deferred<Action|null>(),fresh=deferred<Action|null>();
  let calls=0;ctx.options.decide=()=>++calls===1?old.promise:calls===2?fresh.promise:deferred<Action|null>().promise;
  const hook=await renderHook(()=>useDoudizhu(ctx.options));
  await waitFor(()=>expect(calls).toBe(1));
  await act(()=>ctx.life.emit('background')); await act(()=>ctx.life.emit('active'));
  await waitFor(()=>expect(calls).toBe(2));
  await act(()=>{ctx.life.emit('active');ctx.life.emit('active');}); await hook.rerender({});
  expect(calls).toBe(2);
  await act(()=>old.resolve(action(saved,'play',[saved.hands[1][0].id])));
  expect(mem.writes).toHaveLength(0);
  await act(()=>fresh.resolve(action(saved,'play',[saved.hands[1][0].id])));
  await waitFor(()=>expect(hook.result.current.state?.revision).toBe(saved.revision+1));
  expect(mem.writes).toHaveLength(1); expect(calls).toBe(3);
});

test('rapid human actions use the new revision and invalid actions never persist',async()=>{
  const saved=createGame({startingSeat:0,random:createSeededRandom(4)}),mem=memory(saved),ctx=setup(mem.storage);
  const hook=await renderHook(()=>useDoudizhu(ctx.options));
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  await act(()=>{hook.result.current.submit('call');hook.result.current.submit('call');});
  expect(hook.result.current.state?.revision).toBe(1);expect(mem.writes).toHaveLength(1);
});

test('hint selects a legal suggestion without changing game state or saving',async()=>{
  const saved=playing(),mem=memory(saved),ctx=setup(mem.storage),card=saved.hands[0][0];
  ctx.options.hint=async()=>action(saved,'play',[card.id]);
  const hook=await renderHook(()=>useDoudizhu(ctx.options));
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  await act(()=>hook.result.current.requestHint());
  await waitFor(()=>expect(hook.result.current.selectedIds).toEqual([card.id]));
  expect(hook.result.current.state?.revision).toBe(saved.revision);expect(mem.writes).toEqual([]);
  await act(()=>hook.result.current.submit('play'));
  expect(hook.result.current.state?.revision).toBe(saved.revision+1);expect(mem.writes).toHaveLength(1);
});

test('cancel restart preserves the game; confirm invalidates a late hint and waits for difficulty',async()=>{
  const saved=playing(),mem=memory(saved),ctx=setup(mem.storage),hint=deferred<Action|null>();
  ctx.options.hint=()=>hint.promise;
  const hook=await renderHook(()=>useDoudizhu(ctx.options));
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  const before=JSON.stringify(hook.result.current.state);
  await act(()=>hook.result.current.requestRestart()); await act(()=>hook.result.current.cancelRestart());
  expect(JSON.stringify(hook.result.current.state)).toBe(before);expect(mem.writes).toEqual([]);
  await act(()=>hook.result.current.requestHint()); await act(()=>hook.result.current.requestRestart());
  await act(()=>hook.result.current.confirmRestart());
  expect(hook.result.current.choosingDifficulty).toBe(true);expect(mem.writes).toEqual([]);
  await act(()=>hook.result.current.startNewGame('easy'));
  const gameId=hook.result.current.state?.gameId;expect(gameId).not.toBe(saved.gameId);
  await act(()=>hint.resolve(action(saved,'play',[saved.hands[0][0].id])));
  expect(hook.result.current.state?.gameId).toBe(gameId);expect(hook.result.current.selectedIds).toEqual([]);
});

test('a late failure cannot override a newer successful save',async()=>{
  const saved=playing(),mem=memory(saved),first=deferred<void>();let writes=0;
  const storage:GameStorage={...mem.storage,saveGame:async state=>{if(++writes===1)await first.promise;else await mem.storage.saveGame(state);}};
  const ctx=setup(storage),hook=await renderHook(()=>useDoudizhu(ctx.options));
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  await act(()=>hook.result.current.toggleCard(saved.hands[0][0].id)); await act(()=>hook.result.current.submit('play'));
  await act(()=>hook.result.current.requestRestart());await act(()=>hook.result.current.confirmRestart());await act(()=>hook.result.current.startNewGame('easy'));
  await waitFor(()=>expect(writes).toBe(2)); await act(()=>first.reject(new Error('late')));
  expect(hook.result.current.saveError).toBe(false);
});

test('save failure keeps the current game playable and a later save clears the warning',async()=>{
  const saved=playing(),mem=memory(saved);let writes=0;
  const ctx=setup({...mem.storage,saveGame:async state=>{if(++writes===1)throw new Error('full');await mem.storage.saveGame(state);}});
  const hook=await renderHook(()=>useDoudizhu(ctx.options));await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  await act(()=>hook.result.current.toggleCard(saved.hands[0][0].id));await act(()=>hook.result.current.submit('play'));
  await waitFor(()=>expect(hook.result.current.saveError).toBe(true));expect(hook.result.current.state?.revision).toBe(saved.revision+1);
  await act(()=>hook.result.current.requestRestart());await act(()=>hook.result.current.confirmRestart());await act(()=>hook.result.current.startNewGame('normal'));
  await waitFor(()=>expect(hook.result.current.saveError).toBe(false));
});

test('remount waits for a queued save rather than loading the older game',async()=>{
  const saved=playing(),mem=memory(saved),write=deferred<void>();
  const storage=createSaveQueue({...mem.storage,saveGame:async state=>{await write.promise;await mem.storage.saveGame(state);}});
  const ctx=setup(storage),one=await renderHook(()=>useDoudizhu(ctx.options));await waitFor(()=>expect(one.result.current.loading).toBe(false));
  await act(()=>one.result.current.toggleCard(saved.hands[0][0].id));await act(()=>one.result.current.submit('play'));await one.unmount();
  const two=await renderHook(()=>useDoudizhu(ctx.options));expect(two.result.current.loading).toBe(true);
  await act(()=>write.resolve());await waitFor(()=>expect(two.result.current.loading).toBe(false));
  expect(two.result.current.state?.revision).toBe(saved.revision+1);
});

test('StrictMode restoration does not duplicate an accepted computer action',async()=>{
  const saved=playing(2),mem=memory(saved),ctx=setup(mem.storage);let calls=0;
  ctx.options.decide=async()=>{calls++;return action(saved,'play',[saved.hands[2][0].id]);};
  const hook=await renderHook(()=>useDoudizhu(ctx.options),{wrapper:({children})=><StrictMode>{children}</StrictMode>});
  await waitFor(()=>expect(hook.result.current.state?.revision).toBe(saved.revision+1));
  expect(mem.writes).toHaveLength(1);expect(calls).toBeLessThanOrEqual(2);
});

test('finished restores without computer scheduling or automatic redealing',async()=>{
  const saved={...playing(),phase:'finished' as const,winner:{team:'landlord' as const,seats:[0 as Seat],humanWon:true}},mem=memory(saved),ctx=setup(mem.storage);let calls=0;
  ctx.options.decide=async()=>{calls++;return null;};
  const hook=await renderHook(()=>useDoudizhu(ctx.options));await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.state?.phase).toBe('finished');expect(calls).toBe(0);expect(mem.writes).toEqual([]);
});

test('returning focus immediately restores human permissions',async()=>{
  const ctx=setup(memory(playing()).storage);
  const hook=await renderHook<ReturnType<typeof useDoudizhu>,{focused:boolean}>(({focused})=>useDoudizhu({...ctx.options,focused}),{initialProps:{focused:false}});
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.permissions.humanTurn).toBe(false);
  await hook.rerender({focused:true});
  expect(hook.result.current.permissions.humanTurn).toBe(true);
});

test('a synchronous hint failure is reported without throwing or leaving the spinner active',async()=>{
  const ctx=setup(memory(playing()).storage,{hint:()=>{throw new Error('broken policy');}});
  const hook=await renderHook(()=>useDoudizhu(ctx.options));await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  await act(()=>hook.result.current.requestHint());
  await waitFor(()=>expect(hook.result.current.hinting).toBe(false));
  expect(hook.result.current.message).not.toBe('');
});

test('a computer all-decline redeal consumes the deal random source exactly once',async()=>{
  let saved=createGame({startingSeat:0,random:createSeededRandom(8)});
  saved=applyAction(saved,action(saved,'declineCall')).state;
  saved=applyAction(saved,action(saved,'declineCall')).state;
  let samples=0,decisions=0;
  const move=deferred<Action|null>();
  const ctx=setup(memory(saved).storage,{random:()=>{samples++;return 0;},decide:async()=>++decisions===1?await move.promise:await deferred<Action|null>().promise});
  const hook=await renderHook(()=>useDoudizhu(ctx.options));
  await waitFor(()=>expect(decisions).toBe(1));
  const unrelatedRandom=jest.spyOn(Math,'random');
  try {
    await act(()=>move.resolve(action(saved,'declineCall')));
    await waitFor(()=>expect(hook.result.current.state?.revision).toBe(3));
    expect(samples).toBe(53);expect(unrelatedRandom).not.toHaveBeenCalled();
  } finally {unrelatedRandom.mockRestore();}
});

test('an accepted action enters the shared write queue before an immediate read',async()=>{
  const saved=playing(),mem=memory(saved),queue=createSaveQueue(mem.storage),ctx=setup(queue);
  const hook=await renderHook(()=>useDoudizhu(ctx.options));await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  await act(()=>hook.result.current.toggleCard(saved.hands[0][0].id));
  let read!:ReturnType<GameStorage['loadGame']>;
  await act(()=>{hook.result.current.submit('play');read=queue.loadGame();});
  expect(await read).toMatchObject({status:'valid',state:{revision:saved.revision+1}});
});
