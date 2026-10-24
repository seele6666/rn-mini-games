import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, orientation: 'portrait' }}>
      <Stack.Screen name="index" options={{ orientation: 'portrait' }} />
      <Stack.Screen name="games/2048" options={{ orientation: 'portrait' }} />
      <Stack.Screen name="games/doudizhu" options={{ orientation: 'landscape', statusBarHidden: true }} />
    </Stack>
  </GestureHandlerRootView>;
}
