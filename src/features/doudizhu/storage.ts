import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDeck } from './cards';
import { applyAction, createGame, RULES_VERSION } from './engine';
import { Action, GameState } from './types';

export const SAVE_KEY = 'doudizhu.save.v1';
const MAX_RAW_LENGTH = 1_000_000;
const MAX_HISTORY = 1000;
export type LoadResult = {status:'missing'} | {status:'valid';state:GameState} | {status:'invalid'} | {status:'readError'};
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
type RecordValue = Record<string,unknown>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const seat = (value: unknown) => value === 0 || value === 1 || value === 2;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256;
const deck = new Map(createDeck().map(card => [card.id,card]));

// Compare object values independently of JSON property insertion order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function validCard(value: unknown): boolean {
  if (!record(value) || typeof value.id !== 'string') return false;
  const expected = deck.get(value.id);
  return expected !== undefined && canonical(value) === canonical(expected);
}
function cards(value: unknown, maximum: number): value is GameState['bottomCards'] {
  return Array.isArray(value) && value.length <= maximum && value.every(validCard);
}
function validAction(value: unknown): value is Action {
  return record(value) && ['call','declineCall','grab','declineGrab','play','pass'].includes(value.type as string)
    && seat(value.seat) && identifier(value.gameId) && identifier(value.dealId) && safeInteger(value.revision)
    && (value.cardIds === undefined || (Array.isArray(value.cardIds) && value.cardIds.length <= 20 && value.cardIds.every(id => typeof id === 'string' && deck.has(id))));
}
function validate(value: unknown): GameState | null {
  if (!record(value) || value.version !== 1 || value.rulesVersion !== RULES_VERSION || !record(value.state)) return null;
  const state = value.state;
  if (state.rulesVersion !== RULES_VERSION || !['easy','normal','hard','expert'].includes(state.difficulty as string)
    || !identifier(state.gameId) || !identifier(state.dealId) || !safeInteger(state.revision) || !safeInteger(state.initialRevision)
    || !seat(state.currentSeat) || !['calling','grabbing','playing','finished'].includes(state.phase as string)
    || !Array.isArray(state.history) || state.history.length > MAX_HISTORY
    || state.initialRevision + state.history.length !== state.revision
    || !record(state.initialDeal) || !seat(state.initialDeal.startingSeat)) return null;
  const initial = state.initialDeal;
  if (!Array.isArray(initial.hands) || initial.hands.length !== 3 || !initial.hands.every(hand => cards(hand,17) && hand.length === 17)
    || !cards(initial.bottomCards,3) || initial.bottomCards.length !== 3
    || !Array.isArray(state.hands) || state.hands.length !== 3 || !state.hands.every(hand => cards(hand,20))
    || !cards(state.bottomCards,3) || state.bottomCards.length !== 3 || !cards(state.publicBottomCards,3) || !cards(state.targetCards,20)) return null;
  const initialCards = [...initial.hands.flat(),...initial.bottomCards];
  if (new Set(initialCards.map(card => card.id)).size !== 54) return null;
  if (!state.history.every(entry => record(entry) && validAction(entry.action))) return null;
  // Initial cards are canonical and bounded before the engine sees untrusted data.
  const saved = state as unknown as GameState;
  let replay = createGame({initialDeal:saved.initialDeal,initialRevision:saved.initialRevision,gameId:saved.gameId,dealId:saved.dealId,difficulty:saved.difficulty});
  for (const entry of saved.history) {
    const result = applyAction(replay,entry.action,{random:() => 0});
    if (!result.ok || result.state.dealId !== saved.dealId) return null;
    replay = result.state;
  }
  // Includes derived roles, turn, targets, card conservation, winner and canonical history combos.
  return canonical(replay) === canonical(saved) ? replay : null;
}

export function createGameStorage(adapter: StorageAdapter) {
  return {
    async loadGame(): Promise<LoadResult> {
      let raw: string | null;
      try { raw = await adapter.getItem(SAVE_KEY); } catch { return {status:'readError'}; }
      if (raw === null) return {status:'missing'};
      if (typeof raw !== 'string' || raw.length > MAX_RAW_LENGTH) return {status:'invalid'};
      try {
        const state = validate(JSON.parse(raw));
        return state ? {status:'valid',state} : {status:'invalid'};
      } catch { return {status:'invalid'}; }
    },
    async saveGame(state: GameState): Promise<void> {
      await adapter.setItem(SAVE_KEY,JSON.stringify({version:1,rulesVersion:RULES_VERSION,state}));
    },
  };
}
export const {loadGame,saveGame} = createGameStorage(AsyncStorage);
