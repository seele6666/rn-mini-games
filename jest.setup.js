require('react-native-gesture-handler/jestSetup');

// AsyncStorage requires the native module on a phone; tests use its official adapter.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
