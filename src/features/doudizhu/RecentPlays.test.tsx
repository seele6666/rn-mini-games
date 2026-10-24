import { render } from '@testing-library/react-native';
import { createDeck } from './cards';
import { chooseCombo } from './rules';
import { HistoryEntry, PlayerObservation, Seat } from './types';
import { getRecentPlays, RecentPlays } from './RecentPlays';

function play(revision:number,seat:Seat,ids:string[]):HistoryEntry {
  return {action:{type:'play',seat,gameId:'g',dealId:'d',revision,cardIds:ids},combo:chooseCombo(createDeck().filter(c=>ids.includes(c.id)))!};
}
const pass:HistoryEntry={action:{type:'pass',seat:2,gameId:'g',dealId:'d',revision:5}};
function view(history:HistoryEntry[],targetIds:string[]=[]) {
  return {history,target:targetIds.length?history.find(h=>h.action.cardIds?.join()===targetIds.join())!.combo!:null,
    targetCards:createDeck().filter(c=>targetIds.includes(c.id))} as PlayerObservation;
}
test('keeps the last three full plays in time order; passing never replaces a hand',()=>{
  const rows=[play(1,0,['3-clubs']),play(2,1,['4-clubs']),play(3,2,['5-clubs']),play(4,1,['6-clubs']),pass];
  const result=getRecentPlays(view(rows,['6-clubs']));
  expect(result.map(r=>r.revision)).toEqual([2,3,4]);
  expect(result.map(r=>r.waiting)).toEqual([false,false,true]);
  expect(result[2].cards.map(c=>c.id)).toEqual(['6-clubs']);
});
test('clearing the target preserves history and removes its waiting marker; a fresh deal is empty',()=>{
  const rows=[play(1,0,['3-clubs']),pass];
  expect(getRecentPlays(view(rows))[0].waiting).toBe(false);
  expect(getRecentPlays(view([]))).toEqual([]);
  expect(getRecentPlays(JSON.parse(JSON.stringify(view(rows))))).toEqual(getRecentPlays(view(rows)));
});
test('renders every card of a twenty-card long combination, player and combo labels',async()=>{
  const cards=createDeck().filter(c=>(c.rank>=3&&c.rank<=7&&c.suit!=='spades')||(c.rank>=8&&c.rank<=12&&c.suit==='clubs')),entry=play(1,1,cards.map(c=>c.id));
  // The selector preserves every public card even for a longest possible hand.
  const screen=await render(<RecentPlays state={view([entry],cards.map(c=>c.id))}/>);
  expect(getRecentPlays(view([entry]))[0].cards).toHaveLength(20);
  expect(screen.getByText('最新')).toBeTruthy();
  expect(screen.getByText('待压')).toBeTruthy();
  expect(screen.getByText(/电脑1/)).toBeTruthy();
  expect(screen.getAllByTestId('recent-play-card')).toHaveLength(20);
});
