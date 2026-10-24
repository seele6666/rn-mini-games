import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '../../app/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('the catalog offers both playable games and opens their distinct routes', async () => {
  const screen = await render(<HomeScreen />);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: '开始玩 2048' }));
  expect(router.push).toHaveBeenCalledWith('/games/2048');
  await fireEvent.press(screen.getByRole('button', { name: '开始玩 斗地主' }));
  expect(router.push).toHaveBeenLastCalledWith('/games/doudizhu');
});
