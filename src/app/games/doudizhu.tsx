import { router, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { GameScreen } from '../../features/doudizhu/GameScreen';

export default function DoudizhuRoute() {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress',() => {
      if (router.canGoBack()) return false;
      router.replace('/');
      return true;
    });
    return () => subscription.remove();
  },[focused]);
  return <GameScreen focused={focused} onBack={() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }} />;
}
