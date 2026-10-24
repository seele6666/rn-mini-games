import { createSettingsStore, DEFAULT_SETTINGS, SETTINGS_KEY, validateSettings } from './settings';

test('settings validate each field independently and reject non finite or out of range volume', () => {
  expect(validateSettings({ musicEnabled: false, volume: '0.5', hapticsEnabled: null })).toEqual({ ...DEFAULT_SETTINGS, musicEnabled: false });
  for (const volume of [NaN, Infinity, -1, 1.1]) expect(validateSettings({ volume }).volume).toBe(.25);
  expect(validateSettings({ volume: 0, hapticsEnabled: false })).toEqual({ musicEnabled: true, volume: 0, hapticsEnabled: false });
});

test.each([null, '{broken', 'null', '[]', '17'])('corrupt or absent settings %s fall back without writing or touching the game key', async raw => {
  const storage = { getItem: jest.fn(async () => raw), setItem: jest.fn(async () => {}) };
  expect(await createSettingsStore(storage).load()).toEqual(DEFAULT_SETTINGS);
  expect(storage.getItem).toHaveBeenCalledWith(SETTINGS_KEY);
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('writes across stores are serialized, failure recovers, and reads wait for pending writes', async () => {
  let finish!: () => void;
  const first = new Promise<void>(resolve => { finish = resolve; });
  const storage = { getItem: jest.fn(async () => null), setItem: jest.fn().mockImplementationOnce(() => first).mockRejectedValueOnce(Error('disk')).mockResolvedValue(undefined) };
  const a = createSettingsStore(storage), b = createSettingsStore(storage);
  const p1 = a.save({ ...DEFAULT_SETTINGS, volume: .4 });
  const p2 = b.save({ ...DEFAULT_SETTINGS, volume: .7 });
  const failure = expect(p2).rejects.toThrow('disk');
  const p3 = b.save({ ...DEFAULT_SETTINGS, volume: .9 });
  const load = a.load();
  await Promise.resolve();
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(storage.getItem).not.toHaveBeenCalled();
  finish(); await p1; await failure; await p3; await load;
  expect(storage.setItem.mock.calls.map(call => JSON.parse(call[1]).volume)).toEqual([.4,.7,.9]);
});
