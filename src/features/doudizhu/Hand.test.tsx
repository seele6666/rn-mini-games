import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { createDeck } from './cards';
import { Hand } from './Hand';

test('all twenty physical cards can be individually selected and deselected', async () => {
  const cards = createDeck().slice(0,20);
  function Table() {
    const [selected, setSelected] = useState<string[]>([]);
    return <Hand cards={cards} selectedIds={selected} onToggle={id => setSelected(old => old.includes(id) ? old.filter(value => value !== id) : [...old,id])} />;
  }
  const screen = await render(<Table />);
  expect(screen.getAllByRole('button')).toHaveLength(20);
  const club = screen.getByRole('button',{name:'梅花 3'});
  const diamond = screen.getByRole('button',{name:'方块 3'});
  await fireEvent.press(club);
  expect(screen.getByRole('button',{name:'梅花 3'}).props.accessibilityState.selected).toBe(true);
  expect(diamond.props.accessibilityState.selected).toBe(false);
  await fireEvent.press(screen.getByRole('button',{name:'梅花 3'}));
  expect(screen.getByRole('button',{name:'梅花 3'}).props.accessibilityState.selected).toBe(false);
  for (const button of screen.getAllByRole('button')) await fireEvent.press(button);
  expect(screen.getAllByRole('button').every(button => button.props.accessibilityState.selected)).toBe(true);
});

test('a disabled hand cannot change selection, and selected state survives display sorting', async () => {
  const calls: string[] = [];
  const cards = createDeck().filter(card => ['3-clubs','14-hearts','joker-big'].includes(card.id));
  const before = JSON.stringify(cards);
  const screen = await render(<Hand cards={cards} selectedIds={['14-hearts']} onToggle={id => calls.push(id)} disabled />);
  await fireEvent.press(screen.getByRole('button',{name:'红桃 A'}));
  expect(calls).toEqual([]);
  expect(screen.getByRole('button',{name:'红桃 A'}).props.accessibilityState).toMatchObject({selected:true,disabled:true});
  expect(screen.getByRole('button',{name:'大王'})).toBeTruthy();
  expect(JSON.stringify(cards)).toBe(before);
});

test('pressing and cancelling only changes visual state; committing invokes selection once',async()=>{
  const toggle=jest.fn(),screen=await render(<Hand cards={createDeck().slice(0,1)} selectedIds={[]} onToggle={toggle}/>);
  const card=screen.getByRole('button',{name:'梅花 3'});
  await fireEvent(card,'pressIn');
  expect(toggle).not.toHaveBeenCalled();
  expect(screen.getByTestId('hand-card-3-clubs').props.style).toEqual(expect.arrayContaining([expect.objectContaining({opacity:.72})]));
  await fireEvent(card,'pressOut');
  expect(toggle).not.toHaveBeenCalled();
  await fireEvent.press(card);expect(toggle).toHaveBeenCalledTimes(1);
});
