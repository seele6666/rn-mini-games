import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { GameScreen } from './GameScreen';
import { createDeck, createSeededRandom } from './cards';
import { applyAction, createGame } from './engine';
import { cardName } from './Hand';
import { GameStorage } from './saveQueue';
import { LoadResult } from './storage';
import { Action, GameState, Seat } from './types';
import { SessionOptions } from './useDoudizhu';

const mockFeedback=jest.fn(),mockUpdateSettings=jest.fn();
jest.mock('./useDoudizhuMedia',()=>({useDoudizhuMedia:()=>({
  settings:{musicEnabled:true,volume:.25,hapticsEnabled:true},loaded:true,saveError:false,musicError:false,
  updateSettings:mockUpdateSettings,retryMusic:jest.fn(),feedback:mockFeedback,
})}),{virtual:true});
beforeEach(()=>{mockFeedback.mockClear();mockUpdateSettings.mockClear();});

function step(state:GameState,type:Action['type'],cardIds?:string[]) {
  const result=applyAction(state,{type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision,...(cardIds ? {cardIds} : {})});
  if (!result.ok) throw new Error(result.reason);return result.state;
}
function playing(seat:Seat=0) {
  let state=createGame({startingSeat:seat,random:createSeededRandom(7),gameId:'screen'});
  for(const type of ['call','declineGrab','declineGrab'] as const) state=step(state,type);
  return state;
}
function options(saved:LoadResult) {
  const writes:GameState[]=[];
  const storage:GameStorage={loadGame:async()=>saved,saveGame:async state=>{writes.push(state);}};
  const sessionOptions:Omit<SessionOptions,'focused'>={storage,random:()=>0,decide:()=>new Promise(()=>{}),
    lifecycle:{currentState:'active',addEventListener:()=>({remove:()=>{}})}};
  return {sessionOptions,writes};
}

test('human selection, rejection and confirmation have separate feedback without extra actions',async()=>{
  const state=playing(),ctx=options({status:'valid',state}),screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'出牌'})).toBeTruthy());
  await fireEvent.press(screen.getByRole('button',{name:'出牌'}));
  expect(mockFeedback).toHaveBeenLastCalledWith('error');
  await fireEvent.press(screen.getByRole('button',{name:cardName(state.hands[0][0])}));
  expect(mockFeedback).toHaveBeenLastCalledWith('selection');
  await fireEvent.press(screen.getByRole('button',{name:'出牌'}));
  expect(mockFeedback).toHaveBeenLastCalledWith('confirm');
  expect(ctx.writes).toHaveLength(1);
});

test('cancelled card presses, browsing and disabled controls do not trigger feedback',async()=>{
  const state=playing(),ctx=options({status:'valid',state});
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:cardName(state.hands[0][0])})).toBeTruthy());
  const card=screen.getByRole('button',{name:cardName(state.hands[0][0])});
  await fireEvent(card,'pressIn');
  await fireEvent(card,'pressOut');
  await fireEvent.scroll(screen.getByLabelText('你的手牌'),{nativeEvent:{contentOffset:{x:200,y:0}}});
  await fireEvent.press(screen.getByRole('button',{name:'不出'}));
  expect(mockFeedback).not.toHaveBeenCalled();
  expect(ctx.writes).toEqual([]);
});

test('settings offer a direct license link and confirm feedback for a volume adjustment',async()=>{
  const ctx=options({status:'valid',state:playing()});
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'设置'})).toBeTruthy());
  await fireEvent.press(screen.getByRole('button',{name:'设置'}));
  mockFeedback.mockClear();
  await fireEvent.press(screen.getByRole('button',{name:'增大音乐音量'}));
  expect(mockFeedback).toHaveBeenLastCalledWith('confirm');
  expect(mockUpdateSettings).toHaveBeenLastCalledWith({volume:.5});
  expect(screen.getByRole('button',{name:'查看 CC BY 4.0 许可'})).toBeTruthy();
});

test('settings pause a pending computer and resume the same turn, with independent volume controls',async()=>{
  const state=playing(1),ctx=options({status:'valid',state}),calls=jest.fn((_observation:unknown,_options:{signal:{readonly aborted:boolean}})=>new Promise<Action|null>(()=>{}));
  ctx.sessionOptions.decide=calls;
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(calls).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByRole('button',{name:'设置'}));
  expect(calls.mock.calls[0][1].signal.aborted).toBe(true);
  await fireEvent.press(screen.getByRole('button',{name:'增大音乐音量'}));
  expect(mockUpdateSettings).toHaveBeenLastCalledWith({volume:.5});
  await fireEvent.press(screen.getByRole('switch',{name:'轻震动'}));
  expect(mockUpdateSettings).toHaveBeenLastCalledWith({hapticsEnabled:false});
  await fireEvent.press(screen.getByRole('button',{name:'关闭设置'}));
  await waitFor(()=>expect(calls).toHaveBeenCalledTimes(2));expect(ctx.writes).toEqual([]);
});
test('back remains available during restore and no game action is offered',async()=>{
  let backs=0;const ctx=options({status:'missing'});
  ctx.sessionOptions.storage={...ctx.sessionOptions.storage!,loadGame:()=>new Promise(()=>{})};
  const screen=await render(<GameScreen onBack={()=>backs++} sessionOptions={ctx.sessionOptions}/>);
  expect(screen.getByText('正在恢复对局…')).toBeTruthy();
  expect(screen.queryByRole('button',{name:'出牌'})).toBeNull();
  await fireEvent.press(screen.getByRole('button',{name:'返回小游戏首页'}));expect(backs).toBe(1);
});
test.each(['missing','invalid','readError'] as const)('%s restore explains the result and permits an explicit difficulty choice',async status=>{
  const ctx=options({status});const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByText('选择新局难度')).toBeTruthy());
  if(status==='invalid') expect(screen.getByText('存档损坏或版本不支持，无法恢复。请选择新局难度。')).toBeTruthy();
  if(status==='readError') expect(screen.getByText('暂时无法读取存档。你可以选择难度开始新局。')).toBeTruthy();
  if(status==='missing') expect(screen.queryByRole('alert')).toBeNull();
  expect(ctx.writes).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button',{name:'困难'}));
  await waitFor(()=>expect(ctx.writes).toHaveLength(1));expect(ctx.writes[0].difficulty).toBe('hard');
  expect(screen.getByText('难度：困难')).toBeTruthy();
});
test('calling shows legal bidding choices and hides bottom cards and opponents hands',async()=>{
  const state=createGame({startingSeat:0,random:createSeededRandom(7),gameId:'calling'}),ctx=options({status:'valid',state});
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'叫地主'})).toBeTruthy());
  expect(screen.getByRole('button',{name:'不叫'})).toBeTruthy();expect(screen.queryByRole('button',{name:'出牌'})).toBeNull();
  expect(screen.getByLabelText('底牌尚未公开，共3张')).toBeTruthy();
  expect(screen.queryByRole('button',{name:cardName(state.hands[1][0])})).toBeNull();
  await fireEvent.press(screen.getByRole('button',{name:'叫地主'}));expect(ctx.writes).toHaveLength(1);
  expect(ctx.writes[0].phase).toBe('grabbing');
});
test('grabbing presents grab choices rather than call or play buttons',async()=>{
  let state=createGame({startingSeat:2,random:createSeededRandom(7)});state=step(state,'call');
  const ctx=options({status:'valid',state}),screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'抢地主'})).toBeTruthy());
  expect(screen.getByRole('button',{name:'不抢'})).toBeTruthy();expect(screen.queryByRole('button',{name:'叫地主'})).toBeNull();
  await fireEvent.press(screen.getByRole('button',{name:'不抢'}));expect(ctx.writes[0].revision).toBe(state.revision+1);
});
test('computer turns disable human submissions and selected cards',async()=>{
  const state=playing(1),ctx=options({status:'valid',state}),screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByText('电脑1正在思考…')).toBeTruthy());
  expect(screen.getByRole('button',{name:'出牌'}).props.accessibilityState.disabled).toBe(true);
  const card=screen.getByRole('button',{name:cardName(state.hands[0][0])});expect(card.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(card);await fireEvent.press(screen.getByRole('button',{name:'出牌'}));expect(ctx.writes).toEqual([]);
});
test('lead disallows passing and an empty play explains the error without saving',async()=>{
  const state=playing(),ctx=options({status:'valid',state}),screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'出牌'})).toBeTruthy());
  expect(screen.getByRole('button',{name:'不出'}).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button',{name:'出牌'}));expect(screen.getByText('请先选择要出的牌')).toBeTruthy();expect(ctx.writes).toEqual([]);
});
test('a hint selects cards for confirmation and only the play button commits',async()=>{
  const state=playing(),ctx=options({status:'valid',state}),card=state.hands[0][0];
  ctx.sessionOptions.hint=async()=>({type:'play',seat:0,gameId:state.gameId,dealId:state.dealId,revision:state.revision,cardIds:[card.id]});
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'提示'})).toBeTruthy());
  await fireEvent.press(screen.getByRole('button',{name:'提示'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:cardName(card)}).props.accessibilityState.selected).toBe(true));
  expect(ctx.writes).toEqual([]);await fireEvent.press(screen.getByRole('button',{name:'出牌'}));expect(ctx.writes[0].revision).toBe(state.revision+1);
});
test('following can pass and a pass hint waits for explicit confirmation',async()=>{
  let state=playing(1);state=step(state,'play',[state.hands[1][0].id]);state=step(state,'pass');
  const ctx=options({status:'valid',state});
  ctx.sessionOptions.hint=async()=>({type:'pass',seat:0,gameId:state.gameId,dealId:state.dealId,revision:state.revision});
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'不出'})).toBeTruthy());
  expect(screen.getByRole('button',{name:'不出'}).props.accessibilityState.disabled).toBe(false);
  expect(screen.getByLabelText('当前待压的牌')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button',{name:'提示'}));
  await waitFor(()=>expect(screen.getByText('建议不出，请确认。')).toBeTruthy());
  expect(ctx.writes).toEqual([]);await fireEvent.press(screen.getByRole('button',{name:'不出'}));
  expect(ctx.writes[0].revision).toBe(state.revision+1);expect(ctx.writes[0].target).toBeNull();
});
test('canceling restart preserves selected cards, difficulty and the current game',async()=>{
  const state=playing(),ctx=options({status:'valid',state}),card=state.hands[0][0];
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:cardName(card)})).toBeTruthy());
  await fireEvent.press(screen.getByRole('button',{name:cardName(card)}));await fireEvent.press(screen.getByRole('button',{name:'重新开始'}));
  expect(screen.getByText('重新开始这一局？')).toBeTruthy();await fireEvent.press(screen.getByRole('button',{name:'取消'}));
  expect(screen.getByRole('button',{name:cardName(card)}).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText('难度：普通')).toBeTruthy();expect(ctx.writes).toEqual([]);
});
test('confirming restart waits for a new difficulty before saving',async()=>{
  const ctx=options({status:'valid',state:playing()}),screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'重新开始'})).toBeTruthy());
  await fireEvent.press(screen.getByRole('button',{name:'重新开始'}));await fireEvent.press(screen.getByRole('button',{name:'确认重新开始'}));
  expect(screen.getByText('选择新局难度')).toBeTruthy();expect(ctx.writes).toEqual([]);
  await fireEvent.press(screen.getByRole('button',{name:'简单'}));expect(ctx.writes[0].difficulty).toBe('easy');
});
test('failed persistence is visible while the accepted turn remains playable',async()=>{
  const state=playing(),ctx=options({status:'valid',state});ctx.sessionOptions.storage={...ctx.sessionOptions.storage!,saveGame:async()=>{throw new Error('full');}};
  const screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:cardName(state.hands[0][0])})).toBeTruthy());
  await fireEvent.press(screen.getByRole('button',{name:cardName(state.hands[0][0])}));await fireEvent.press(screen.getByRole('button',{name:'出牌'}));
  await waitFor(()=>expect(screen.getByText('进度尚未保存；当前对局可继续，后续操作会重试。')).toBeTruthy());
});
test('a farmer teammate finishing also shows a human win and an explicit next game',async()=>{
  const deck=createDeck();let state=createGame({gameId:'teamwin',initialDeal:{hands:[deck.slice(0,17),deck.slice(17,34),deck.slice(34,51)],bottomCards:deck.slice(51),startingSeat:1}});
  for(const type of ['call','declineGrab','declineGrab'] as const) state=step(state,type);
  state=step(state,'play',[state.hands[1][0].id]);state=step(state,'play',[state.hands[2][0].id]);state=step(step(state,'pass'),'pass');
  while(state.phase!=='finished') {state=step(state,'play',[state.hands[2][0].id]);if(state.phase!=='finished')state=step(step(state,'pass'),'pass');}
  const ctx=options({status:'valid',state}),screen=await render(<GameScreen onBack={()=>{}} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByText('你赢了 · 农民获胜')).toBeTruthy());
  expect(screen.getByRole('button',{name:'再来一局'})).toBeTruthy();expect(screen.queryByRole('button',{name:'出牌'})).toBeNull();expect(ctx.writes).toEqual([]);
});
test('external focus overrides session injection and prevents human play',async()=>{
  const ctx=options({status:'valid',state:playing()});
  const screen=await render(<GameScreen onBack={()=>{}} focused={false} sessionOptions={ctx.sessionOptions}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'出牌'})).toBeTruthy());
  expect(screen.getByRole('button',{name:'出牌'}).props.accessibilityState.disabled).toBe(true);
});
