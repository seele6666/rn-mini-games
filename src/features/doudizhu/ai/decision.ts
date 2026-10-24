import { Action, Difficulty, PlayerObservation } from '../types';
import { chooseAction } from './heuristic';
import { chooseExpertAction, chooseHardAction } from './search';

export type Decision = (observation: PlayerObservation, options: {difficulty: Difficulty; signal: {readonly aborted: boolean}; random: () => number; clock?: () => number}) => Promise<Action | null>;

/** Shared by computer turns and human hints. */
export const defaultDecision: Decision = async (observation, options) => {
  await new Promise<void>(resolve => setTimeout(resolve,180));
  if (options.signal.aborted) return null;
  if (observation.phase === 'playing') {
    if (options.difficulty === 'expert') return (await chooseExpertAction(observation,options)).action;
    if (options.difficulty === 'hard') return (await chooseHardAction(observation,options)).action;
  }
  return chooseAction(observation,options);
};
