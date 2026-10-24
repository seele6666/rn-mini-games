import { router } from 'expo-router';
import { GameScreen } from '../../features/game2048/ui/screen/GameScreen';

export default function Game2048Route() {
  return <GameScreen onBack={() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }} />;
}
