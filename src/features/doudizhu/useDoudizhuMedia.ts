import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { createSettingsStore, SettingsStorage, DEFAULT_SETTINGS, DoudizhuSettings, validateSettings } from './settings';

const SOURCE = require('../../../assets/audio/monkeys-spinning-monkeys.mp3');
type Feedback = 'selection' | 'confirm' | 'error';
export type MediaOptions = { focused: boolean; storage?: SettingsStorage; lifecycle?: Pick<typeof AppState, 'currentState' | 'addEventListener'>; now?: () => number };

export function useDoudizhuMedia({ focused, storage, lifecycle = AppState, now = Date.now }: MediaOptions) {
  const store = useMemo(() => createSettingsStore(storage), [storage]);
  const [settings, setSettings] = useState<DoudizhuSettings>({ ...DEFAULT_SETTINGS });
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const [active, setActive] = useState(lifecycle.currentState === 'active');
  const [modeReady, setModeReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const unlocked = useRef(Platform.OS !== 'web');
  // useAudioPlayer owns native disposal, including React Strict Mode's effect replay.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const mounted = useRef(true);
  const settingsRef = useRef(settings);
  const readyRef = useRef(false);
  const eligible = loaded && focused && active && settings.musicEnabled;
  const eligibleRef = useRef(eligible);
  eligibleRef.current = eligible;
  const saveRevision = useRef(0);
  const lastFeedback = useRef(-Infinity);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; eligibleRef.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    store.load().then(value => { if (!cancelled) { settingsRef.current = value; setSettings(value); } }, () => { if (!cancelled) setSaveError(true); }).finally(() => { if (!cancelled) { readyRef.current = true; setLoaded(true); } });
    return () => { cancelled = true; readyRef.current = false; };
  }, [store]);
  useEffect(() => {
    const sub = lifecycle.addEventListener('change', state => {
      // Invalidate immediately, before React renders the updated AppState.
      if (state !== 'active') { eligibleRef.current = false; try { player.pause(); } catch {} }
      setActive(state === 'active');
    });
    return () => sub.remove();
  }, [lifecycle, player]);

  useEffect(() => {
    let cancelled = false;
    setModeReady(false);
    try { player.replace(SOURCE); }
    catch { setMusicError(true); return; }
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'doNotMix', allowsRecording: false }).then(() => {
      if (!cancelled) setModeReady(true);
    }, () => { if (!cancelled) setMusicError(true); });
    return () => { cancelled = true; };
  }, [player, attempt]);

  useEffect(() => {
    try { player.loop = true; player.volume = settings.volume; }
    catch { setMusicError(true); }
  }, [player, settings.volume]);

  useEffect(() => {
    if (status.error) { setMusicError(true); try { player.pause(); } catch {} }
  }, [player, status.error]);

  // Native transient-focus recovery can resume independently of our play effect.
  useEffect(() => {
    if (status.playing && !eligible) { try { player.pause(); } catch {} }
  }, [player, status.playing, eligible]);

  const start = useCallback(() => {
    if (!mounted.current || !eligibleRef.current || !modeReady || !status.isLoaded) return;
    try {
      // Native play is synchronous; accepting a promise also guards adapters/platform changes.
      const result: unknown = player.play();
      void Promise.resolve(result).then(() => {
        if (!mounted.current) return;
        if (!eligibleRef.current) { try { player.pause(); } catch {} }
        else setMusicError(false);
      }, () => { if (mounted.current) setMusicError(true); });
    } catch { if (mounted.current) setMusicError(true); }
  }, [player, modeReady, status.isLoaded]);

  useEffect(() => {
    if (eligible && modeReady && status.isLoaded && unlocked.current && !status.error) start();
    else { try { player.pause(); } catch {} }
    return () => { try { player.pause(); } catch {} };
  }, [player, eligible, modeReady, status.isLoaded, status.error, start]);

  // Web play must run inside an actual user gesture. Register after initialization.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !eligible || !modeReady || !status.isLoaded || unlocked.current) return;
    const unlock = () => {
      unlocked.current = true;
      document.removeEventListener('pointerup', unlock); document.removeEventListener('keydown', unlock);
      start();
    };
    document.addEventListener('pointerup', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => { document.removeEventListener('pointerup', unlock); document.removeEventListener('keydown', unlock); };
  }, [eligible, modeReady, status.isLoaded, start]);

  const updateSettings = useCallback((patch: Partial<DoudizhuSettings>) => {
    if (!readyRef.current) return;
    const next = validateSettings({ ...settingsRef.current, ...patch });
    settingsRef.current = next; setSettings(next);
    if (!next.musicEnabled) { eligibleRef.current = false; try { player.pause(); } catch {} }
    const revision = ++saveRevision.current;
    void store.save(next).then(() => { if (mounted.current && saveRevision.current === revision) setSaveError(false); }, () => { if (mounted.current && saveRevision.current === revision) setSaveError(true); });
  }, [store, player]);

  const retryMusic = useCallback(() => {
    setMusicError(false);
    if (modeReady && status.isLoaded && !status.error) { unlocked.current = true; start(); }
    else setAttempt(value => value + 1);
  }, [modeReady, status.isLoaded, status.error, start]);

  const feedback = useCallback((kind: Feedback) => {
    if (!mounted.current || !readyRef.current || !focused || lifecycle.currentState !== 'active' || !settingsRef.current.hapticsEnabled) return;
    const time = now(); if (time - lastFeedback.current < 120) return;
    lastFeedback.current = time;
    try {
      const pending = kind === 'selection' ? Haptics.selectionAsync() : kind === 'confirm' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      void pending.catch(() => {});
    } catch {}
  }, [focused, lifecycle, now]);
  return { settings, loaded, saveError, musicError, updateSettings, retryMusic, feedback };
}
