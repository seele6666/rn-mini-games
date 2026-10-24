import AsyncStorage from '@react-native-async-storage/async-storage';

export type DoudizhuSettings = { musicEnabled: boolean; volume: number; hapticsEnabled: boolean };
export const SETTINGS_KEY = 'doudizhu.settings.v1';
export const DEFAULT_SETTINGS: DoudizhuSettings = { musicEnabled: true, volume: .25, hapticsEnabled: true };
export type SettingsStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export function validateSettings(value: unknown): DoudizhuSettings {
  const source = value && typeof value === 'object' ? value as Partial<DoudizhuSettings> : {};
  return {
    musicEnabled: typeof source.musicEnabled === 'boolean' ? source.musicEnabled : true,
    volume: typeof source.volume === 'number' && Number.isFinite(source.volume) && source.volume >= 0 && source.volume <= 1 ? source.volume : .25,
    hapticsEnabled: typeof source.hapticsEnabled === 'boolean' ? source.hapticsEnabled : true,
  };
}
// Shared by storage identity so a newly mounted screen cannot race an older pending write.
const tails = new WeakMap<SettingsStorage, Promise<void>>();
export function createSettingsStore(storage: SettingsStorage = AsyncStorage) {
  return {
    async load() {
      await tails.get(storage);
      const raw = await storage.getItem(SETTINGS_KEY);
      try { return validateSettings(raw ? JSON.parse(raw) : null); }
      catch { return { ...DEFAULT_SETTINGS }; }
    },
    save(value: DoudizhuSettings) {
      const snapshot = JSON.stringify(validateSettings(value));
      const pending = (tails.get(storage) ?? Promise.resolve()).then(() => storage.setItem(SETTINGS_KEY, snapshot));
      tails.set(storage, pending.catch(() => {}));
      return pending;
    },
  };
}
