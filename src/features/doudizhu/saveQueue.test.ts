import { createSaveQueue, GameStorage } from './saveQueue';
import { createGame } from './engine';
import { createSeededRandom } from './cards';
import { GameState } from './types';

const initial = () => createGame({random:createSeededRandom(4),gameId:'queue'});
test('writes serialize and reentry waits for already queued writes',async () => {
  let release!: () => void;
  const pending=new Promise<void>(resolve => {release=resolve;});
  let saved: GameState | null=null, writes=0;
  const storage: GameStorage={loadGame:async () => saved ? {status:'valid',state:saved} : {status:'missing'},saveGame:async state => {if (++writes===1) await pending; saved=state;}};
  const queue=createSaveQueue(storage), first=initial(), second={...initial(),gameId:'new'};
  const one=queue.saveGame(first), two=queue.saveGame(second);
  let loaded=false; const read=queue.loadGame().then(result => {loaded=true; return result;});
  await Promise.resolve(); expect(writes).toBe(1); expect(loaded).toBe(false);
  release(); await Promise.all([one,two]);
  expect(await read).toEqual({status:'valid',state:second});
});
test('captures the snapshot when queued rather than after earlier writes finish',async () => {
  let release!: () => void; const pending=new Promise<void>(resolve => {release=resolve;});
  const received: GameState[]=[];
  const queue=createSaveQueue({loadGame:async () => ({status:'missing'}),saveGame:async state => {if (!received.length) await pending; received.push(state);}});
  const first=initial(), next=initial(), expected=JSON.parse(JSON.stringify(next));
  const one=queue.saveGame(first), two=queue.saveGame(next);
  next.hands[0].pop(); next.initialDeal.hands[0][0].rank=99;
  release(); await Promise.all([one,two]); expect(received[1]).toEqual(expected);
});
test('failed writes reject their own promise without poisoning later writes or reads',async () => {
  let writes=0, saved: GameState | null=null;
  const queue=createSaveQueue({loadGame:async () => saved ? {status:'valid',state:saved} : {status:'missing'},saveGame:async state => {if (++writes===1) throw new Error('full'); saved=state;}});
  await expect(queue.saveGame(initial())).rejects.toThrow('full');
  const next=initial(); await queue.saveGame(next);
  expect(await queue.loadGame()).toEqual({status:'valid',state:next});
});
