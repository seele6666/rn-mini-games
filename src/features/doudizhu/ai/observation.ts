import { getLegalActions } from '../engine';
import { Action, Card, Combo, GameState, PlayerObservation, Seat } from '../types';

const card = (value: Card): Card => ({id:value.id,rank:value.rank,...(value.suit === undefined ? {} : {suit:value.suit})});
const combo = (value: Combo): Combo => ({kind:value.kind,bodyLength:value.bodyLength,bodyRank:value.bodyRank,wing:value.wing});
const action = (value: Action): Action => ({type:value.type,seat:value.seat,gameId:value.gameId,dealId:value.dealId,revision:value.revision,...(value.cardIds === undefined ? {} : {cardIds:[...value.cardIds]})});

/** Copy a visible-field whitelist; never retain the source state in a closure. */
export function buildObservation(state: GameState, seat: Seat, options: { includeLegalActions?: boolean } = {}): PlayerObservation {
  return {
    gameId:state.gameId,dealId:state.dealId,revision:state.revision,rulesVersion:state.rulesVersion,
    seat,phase:state.phase,currentSeat:state.currentSeat,hand:state.hands[seat].map(card),
    publicBottomCards:state.landlord === null ? [] : state.publicBottomCards.map(card),
    remainingCounts:state.hands.map(hand => hand.length) as PlayerObservation['remainingCounts'],
    bidding:{declined:[...state.bidding.declined],firstCaller:state.bidding.firstCaller,lastBidder:state.bidding.lastBidder,queue:[...state.bidding.queue],hadGrab:state.bidding.hadGrab},
    landlord:state.landlord,target:state.target ? combo(state.target) : null,targetCards:state.targetCards.map(card),
    lastPlayer:state.lastPlayer,passCount:state.passCount,
    history:state.history.map(entry => ({action:action(entry.action),...(entry.combo ? {combo:combo(entry.combo)} : {})})),
    winner:state.winner ? {team:state.winner.team,seats:[...state.winner.seats],humanWon:state.winner.humanWon} : null,
    ...(options.includeLegalActions === false ? {} : {legalActions:getLegalActions(state,seat).map(action)}),
  };
}
