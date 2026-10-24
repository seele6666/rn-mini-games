export type Seat = 0 | 1 | 2;
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export interface Card { id: string; rank: number; suit?: string }
export type ComboKind = 'single' | 'pair' | 'triple' | 'tripleSingle' | 'triplePair' | 'straight' | 'pairStraight' | 'airplane' | 'airplaneSingle' | 'airplanePair' | 'fourSingle' | 'fourPair' | 'bomb' | 'rocket';
export interface Combo { kind: ComboKind; bodyLength: number; bodyRank: number; wing: 'none' | 'single' | 'pair' }
export interface Play { cards: Card[]; combo: Combo }
export type ActionType = 'call' | 'declineCall' | 'grab' | 'declineGrab' | 'play' | 'pass';
export interface Action { type: ActionType; seat: Seat; gameId: string; dealId: string; revision: number; cardIds?: string[] }
export interface InitialDeal { hands: [Card[], Card[], Card[]]; bottomCards: Card[]; startingSeat: Seat }
export interface HistoryEntry { action: Action; combo?: Combo }
export interface Winner { team: 'landlord' | 'farmers'; seats: Seat[]; humanWon: boolean }
export interface GameState {
  gameId: string; dealId: string; revision: number; initialRevision: number; rulesVersion: number; difficulty: Difficulty;
  phase: 'calling' | 'grabbing' | 'playing' | 'finished'; currentSeat: Seat;
  initialDeal: InitialDeal; hands: [Card[], Card[], Card[]]; bottomCards: Card[]; publicBottomCards: Card[];
  bidding: { declined: Seat[]; firstCaller: Seat | null; lastBidder: Seat | null; queue: Seat[]; hadGrab: boolean };
  landlord: Seat | null; target: Combo | null; targetCards: Card[]; lastPlayer: Seat | null; passCount: number;
  history: HistoryEntry[]; winner: Winner | null;
}
/** Information visible to one seat. No deal snapshot or opponent hands. */
export interface PlayerObservation {
  gameId: string; dealId: string; revision: number; rulesVersion: number;
  seat: Seat; phase: GameState['phase']; currentSeat: Seat;
  hand: Card[]; publicBottomCards: Card[]; remainingCounts: [number, number, number];
  bidding: GameState['bidding']; landlord: Seat | null;
  target: Combo | null; targetCards: Card[]; lastPlayer: Seat | null; passCount: number;
  history: HistoryEntry[]; winner: Winner | null;
  /** Omit when the caller will generate candidates inside a search budget. */
  legalActions?: Action[];
}
