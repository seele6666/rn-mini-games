import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Game2048Route from '../../app/games/2048';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() } }));

test.each([true, false])('returns to the catalog when navigation history is %s', async (hasHistory) => {
  jest.clearAllMocks();
  (router.canGoBack as jest.Mock).mockReturnValue(hasHistory);
  const screen = await render(<GestureHandlerRootView><Game2048Route /></GestureHandlerRootView>);
  await waitFor(() => screen.getByLabelText('2048 棋盘'));
  await fireEvent.press(screen.getByRole('button', { name: '返回小游戏首页' }));
  if (hasHistory) {
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  } else {
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  }
});
