import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';
import DoudizhuRoute from '../../app/games/doudizhu';

jest.mock('expo-router',()=>({router:{back:jest.fn(),replace:jest.fn(),canGoBack:jest.fn()},useIsFocused:()=>true}));
// Node has no native AudioPlayer class. Keep the route and media hook real;
// useDoudizhuMedia.test.tsx checks the native playback and lifecycle contract.
const mockAudioPlayer = { play: jest.fn(), pause: jest.fn(), replace: jest.fn(), loop: false, volume: 1 };
jest.mock('expo-audio',()=>({
  useAudioPlayer:()=>mockAudioPlayer,
  useAudioPlayerStatus:()=>({isLoaded:false,error:null,playing:false}),
  setAudioModeAsync:async()=>{},
}));
jest.mock('expo-haptics',()=>({
  selectionAsync:async()=>{},impactAsync:async()=>{},notificationAsync:async()=>{},
  ImpactFeedbackStyle:{Light:'light'},NotificationFeedbackType:{Error:'error'},
}));

test.each([true,false])('doudizhu returns to the catalog with navigation history %s',async hasHistory=>{
  jest.clearAllMocks();(router.canGoBack as jest.Mock).mockReturnValue(hasHistory);
  const screen=await render(<DoudizhuRoute />);
  await fireEvent.press(screen.getByRole('button',{name:'返回小游戏首页'}));
  if(hasHistory) {expect(router.back).toHaveBeenCalledTimes(1);expect(router.replace).not.toHaveBeenCalled();}
  else {expect(router.replace).toHaveBeenCalledWith('/');expect(router.back).not.toHaveBeenCalled();}
});

test.each([true,false])('hardware back preserves normal navigation and provides a home fallback when history is %s',async hasHistory=>{
  jest.clearAllMocks();(router.canGoBack as jest.Mock).mockReturnValue(hasHistory);
  let hardware:Parameters<typeof BackHandler.addEventListener>[1]|undefined;
  const listener=jest.spyOn(BackHandler,'addEventListener').mockImplementation((_event,handler)=>{hardware=handler;return {remove:()=>{hardware=undefined;}};});
  try {
    const screen=await render(<DoudizhuRoute />);
    expect(hardware).toBeDefined();
    expect(hardware!({type:'hardwareBackPress',timeStamp:1})).toBe(!hasHistory);
    if(hasHistory) expect(router.replace).not.toHaveBeenCalled();
    else expect(router.replace).toHaveBeenCalledWith('/');
    await screen.unmount();expect(hardware).toBeUndefined();
  } finally {listener.mockRestore();}
});
