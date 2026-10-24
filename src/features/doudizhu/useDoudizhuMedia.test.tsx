import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppStateStatus, Platform } from 'react-native';
import { useDoudizhuMedia } from './useDoudizhuMedia';

const mockPlayer = { play: jest.fn(), pause: jest.fn(), replace: jest.fn(), release: jest.fn(), loop: false, volume: 1, addListener: jest.fn() };
const mockMode = jest.fn(async () => {});
let mockStatus: { isLoaded: boolean; error: string | null; playing?: boolean } = { isLoaded: true, error: null };
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => { require('react').useEffect(() => () => mockPlayer.release(), []); return mockPlayer; },
  useAudioPlayerStatus: () => mockStatus,
  setAudioModeAsync: (...args: unknown[]) => mockMode(...args as []),
}));
const mockSelection = jest.fn(async () => {}), mockImpact = jest.fn(async () => {}), mockError = jest.fn(async () => {});
jest.mock('expo-haptics', () => ({ selectionAsync: () => mockSelection(), impactAsync: () => mockImpact(), notificationAsync: () => mockError(), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Error: 'error' } }));

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function setup() {
  const handlers = new Set<(state: AppStateStatus) => void>();
  const lifecycle = { currentState: 'active' as AppStateStatus, addEventListener: (_: 'change', fn: (s: AppStateStatus) => void) => { handlers.add(fn); return { remove: () => handlers.delete(fn) }; }, emit(s: AppStateStatus) { this.currentState = s; handlers.forEach(fn => fn(s)); } };
  const storage = { getItem: jest.fn(async (): Promise<string | null> => null), setItem: jest.fn(async () => {}) };
  return { lifecycle, storage };
}
beforeEach(() => { jest.clearAllMocks(); mockMode.mockImplementation(async () => {}); mockPlayer.play.mockImplementation(() => {}); mockStatus = { isLoaded: true, error: null }; });

test('plays locally in a loop at 25%, pauses off route/background, resumes and releases on unmount', async () => {
  const ctx = setup();
  const hook = await renderHook<ReturnType<typeof useDoudizhuMedia>, {focused:boolean}>(({ focused }) => useDoudizhuMedia({ ...ctx, focused }), { initialProps: { focused: true } });
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  expect(mockMode).toHaveBeenCalledWith(expect.objectContaining({ interruptionMode: 'doNotMix', shouldPlayInBackground: false }));
  expect(mockPlayer.volume).toBe(.25); expect(mockPlayer.loop).toBe(true);
  await act(() => ctx.lifecycle.emit('background')); expect(mockPlayer.pause).toHaveBeenCalled();
  await act(() => ctx.lifecycle.emit('active')); await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2));
  await hook.rerender({ focused: false }); const count = mockPlayer.play.mock.calls.length;
  await act(() => ctx.lifecycle.emit('active')); expect(mockPlayer.play).toHaveBeenCalledTimes(count);
  await hook.unmount(); expect(mockPlayer.release).toHaveBeenCalledTimes(1);
});

test.each(['background', 'focus', 'unmount'] as const)('late audio mode initialization after %s never starts music', async kind => {
  const mode = deferred<void>(); mockMode.mockImplementation(() => mode.promise);
  const ctx = setup(); const hook = await renderHook<ReturnType<typeof useDoudizhuMedia>, {focused:boolean}>(({ focused }) => useDoudizhuMedia({ ...ctx, focused }), { initialProps: { focused: true } });
  await waitFor(() => expect(mockMode).toHaveBeenCalled());
  if (kind === 'background') await act(() => ctx.lifecycle.emit('background'));
  if (kind === 'focus') await hook.rerender({ focused: false });
  if (kind === 'unmount') await hook.unmount();
  await act(() => mode.resolve()); expect(mockPlayer.play).not.toHaveBeenCalled();
});

test('music failure is retryable and settings immediately stop music and persist', async () => {
  const ctx = setup(); mockPlayer.play.mockImplementationOnce(() => { throw Error('audio'); });
  const hook = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true }));
  await waitFor(() => expect(hook.result.current.musicError).toBe(true));
  await act(() => hook.result.current.retryMusic()); await waitFor(() => expect(hook.result.current.musicError).toBe(false));
  await act(() => hook.result.current.updateSettings({ musicEnabled: false, volume: .5 }));
  expect(mockPlayer.pause).toHaveBeenCalled(); expect(mockPlayer.volume).toBe(.5);
  await waitFor(() => expect(ctx.storage.setItem).toHaveBeenCalledWith('doudizhu.settings.v1', JSON.stringify({ musicEnabled: false, volume: .5, hapticsEnabled: true })));
});

test.each(['source', 'mode'] as const)('%s initialization failure keeps settings usable and retries successfully', async kind => {
  const ctx = setup();
  if (kind === 'source') mockPlayer.replace.mockImplementationOnce(() => { throw Error('unavailable'); });
  else mockMode.mockRejectedValueOnce(Error('unavailable'));
  const hook = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true }));
  await waitFor(() => expect(hook.result.current.loaded && hook.result.current.musicError).toBe(true));
  await act(() => hook.result.current.updateSettings({ volume: .4 }));
  expect(hook.result.current.settings.volume).toBe(.4);
  await act(() => hook.result.current.retryMusic());
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  expect(hook.result.current.musicError).toBe(false);
});

test('haptics use three distinct signals, throttle, honor the switch and swallow failures', async () => {
  const ctx = setup(); let now = 0;
  const hook = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true, now: () => now }));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  await act(() => { hook.result.current.feedback('selection'); hook.result.current.feedback('selection'); }); expect(mockSelection).toHaveBeenCalledTimes(1);
  now = 200; await act(() => hook.result.current.feedback('confirm')); expect(mockImpact).toHaveBeenCalledTimes(1);
  mockError.mockRejectedValueOnce(Error('unsupported')); now = 400; await act(() => hook.result.current.feedback('error')); expect(mockError).toHaveBeenCalledTimes(1);
  await act(() => hook.result.current.updateSettings({ hapticsEnabled: false })); now = 600;
  await act(() => hook.result.current.feedback('selection')); expect(mockSelection).toHaveBeenCalledTimes(1);
});

test('settings read/write errors are visible and a successful later save clears the error', async () => {
  const ctx = setup(); ctx.storage.getItem.mockRejectedValueOnce(Error('read'));
  const hook = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: false }));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true)); expect(hook.result.current.saveError).toBe(true);
  ctx.storage.setItem.mockRejectedValueOnce(Error('write'));
  await act(() => hook.result.current.updateSettings({ volume: .5 })); expect(hook.result.current.saveError).toBe(true);
  await act(() => hook.result.current.updateSettings({ volume: .75 })); await waitFor(() => expect(hook.result.current.saveError).toBe(false));
});

test('restored disabled music never autoplays while settings are loading or after restore', async () => {
  const ctx = setup(), read = deferred<string | null>(); ctx.storage.getItem.mockImplementation(() => read.promise);
  const hook = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true }));
  expect(mockPlayer.play).not.toHaveBeenCalled();
  await act(() => read.resolve(JSON.stringify({ musicEnabled: false, hapticsEnabled: false, volume: .6 })));
  expect(hook.result.current.loaded).toBe(true); expect(mockPlayer.play).not.toHaveBeenCalled(); expect(mockPlayer.volume).toBe(.6);
});

test('music, volume and haptics persist together across a screen remount', async () => {
  const ctx = setup(); let saved: string | null = null;
  ctx.storage.getItem.mockImplementation(async () => saved);
  ctx.storage.setItem.mockImplementation(async (_key?: string, value?: string) => { saved = value ?? null; });
  const first = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true }));
  await waitFor(() => expect(first.result.current.loaded).toBe(true));
  await act(() => first.result.current.updateSettings({ musicEnabled: false, volume: .8, hapticsEnabled: false }));
  await first.unmount(); mockPlayer.play.mockClear();
  const second = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true }));
  await waitFor(() => expect(second.result.current.loaded).toBe(true));
  expect(second.result.current.settings).toEqual({ musicEnabled: false, volume: .8, hapticsEnabled: false });
  expect(mockPlayer.volume).toBe(.8); expect(mockPlayer.play).not.toHaveBeenCalled();
  await act(() => second.result.current.feedback('selection')); expect(mockSelection).not.toHaveBeenCalled();
});

test('decoder errors pause and retry replaces the failed source, and late load stays silent off route', async () => {
  const ctx = setup(); mockStatus = { isLoaded: false, error: null };
  const hook = await renderHook<ReturnType<typeof useDoudizhuMedia>, {focused:boolean}>(({ focused }) => useDoudizhuMedia({ ...ctx, focused }), { initialProps: { focused: true } });
  mockStatus = { isLoaded: false, error: 'decode' }; await hook.rerender({ focused: true });
  expect(hook.result.current.musicError).toBe(true);
  const replaces = mockPlayer.replace.mock.calls.length;
  await act(() => hook.result.current.retryMusic()); expect(mockPlayer.replace).toHaveBeenCalledTimes(replaces + 1);
  await hook.rerender({ focused: false }); mockStatus = { isLoaded: true, error: null }; await hook.rerender({ focused: false });
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test.each(['focus', 'background', 'switch'] as const)('native interruption recovery after %s cannot resume ineligible music', async kind => {
  const ctx = setup();
  const hook = await renderHook<ReturnType<typeof useDoudizhuMedia>, {focused:boolean}>(({ focused }) => useDoudizhuMedia({ ...ctx, focused }), { initialProps: { focused: true } });
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  if (kind === 'focus') await hook.rerender({ focused: false });
  if (kind === 'background') await act(() => ctx.lifecycle.emit('background'));
  if (kind === 'switch') await act(() => hook.result.current.updateSettings({ musicEnabled: false }));
  mockPlayer.pause.mockClear();
  // SDK57 may resume a player paused by transient native audio focus loss.
  mockStatus = { isLoaded: true, error: null, playing: true };
  await hook.rerender({ focused: kind !== 'focus' });
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

test.each(['focus', 'background', 'switch'] as const)('a late asynchronous play completion after %s stays paused', async kind => {
  const pending = deferred<void>(); mockPlayer.play.mockImplementation(() => pending.promise);
  const ctx = setup();
  const hook = await renderHook<ReturnType<typeof useDoudizhuMedia>, {focused:boolean}>(({ focused }) => useDoudizhuMedia({ ...ctx, focused }), { initialProps: { focused: true } });
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  if (kind === 'focus') await hook.rerender({ focused: false });
  if (kind === 'background') await act(() => ctx.lifecycle.emit('background'));
  if (kind === 'switch') await act(() => hook.result.current.updateSettings({ musicEnabled: false }));
  mockPlayer.pause.mockClear();
  await act(() => pending.resolve());
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

test('haptics stay disabled before restore, off route and in background', async () => {
  const ctx = setup(), read = deferred<string | null>(); ctx.storage.getItem.mockImplementation(() => read.promise);
  const hook = await renderHook<ReturnType<typeof useDoudizhuMedia>, {focused:boolean}>(({ focused }) => useDoudizhuMedia({ ...ctx, focused }), { initialProps: { focused: true } });
  await act(() => hook.result.current.feedback('selection'));
  await act(() => read.resolve(null));
  await hook.rerender({ focused: false }); await act(() => hook.result.current.feedback('confirm'));
  await hook.rerender({ focused: true }); await act(() => ctx.lifecycle.emit('background'));
  await act(() => hook.result.current.feedback('error'));
  expect(mockSelection).not.toHaveBeenCalled(); expect(mockImpact).not.toHaveBeenCalled(); expect(mockError).not.toHaveBeenCalled();
});

test('Web waits for a real interaction and plays once, with listeners removed on leaving', async () => {
  const originalOS = Platform.OS, originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const listeners = new Map<string, () => void>();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) } });
  try {
    const ctx = setup(); const hook = await renderHook(() => useDoudizhuMedia({ ...ctx, focused: true }));
    await waitFor(() => expect(listeners.has('pointerup')).toBe(true)); expect(mockPlayer.play).not.toHaveBeenCalled();
    await act(() => listeners.get('pointerup')!()); expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0); await hook.unmount(); expect(listeners.size).toBe(0);
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else Reflect.deleteProperty(globalThis, 'document');
  }
});
