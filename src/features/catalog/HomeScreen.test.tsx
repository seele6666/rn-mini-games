import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '../../app/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('the catalog offers only 2048 and opens its route', async () => {
  const screen = await render(<HomeScreen />);
  expect(screen.getAllByRole('button')).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: '开始玩 2048' }));
  expect(router.push).toHaveBeenCalledWith('/games/2048');
});
