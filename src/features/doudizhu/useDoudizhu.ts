import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Action, ActionType, Difficulty, GameState, PlayerObservation } from './types';
import { GameStorage, persistence } from './saveQueue';
import { applyAction, createGame } from './engine';
import { buildObservation } from './ai/observation';
import { defaultDecision, Decision } from './ai/decision';
export type { Decision } from './ai/decision';

export interface SessionOptions {
  focused: boolean; storage?: GameStorage; decide?: Decision; hint?: Decision;
  random?: () => number; policyRandom?: () => number; clock?: () => number;
  lifecycle?: Pick<typeof AppState,'currentState'|'addEventListener'>;
}
interface Task { generation: number; gameId: string; dealId: string; revision: number; seat: number; signal: {aborted: boolean} }
let gameSequence = 0;


function fallback(state: GameState): Action {
  const type = state.phase === 'calling' ? 'declineCall' : state.phase === 'grabbing' ? 'declineGrab' : state.target ? 'pass' : 'play';
  return {type,seat:state.currentSeat,gameId:state.gameId,dealId:state.dealId,revision:state.revision,
    ...(type === 'play' ? {cardIds:[state.hands[state.currentSeat][0].id]} : {})};
}

export function useDoudizhu(options: SessionOptions) {
  const dependencies = useRef({storage:options.storage ?? persistence,decide:options.decide ?? defaultDecision,
    hint:options.hint ?? defaultDecision,random:options.random ?? Math.random,
    policyRandom:options.policyRandom ?? Math.random,clock:options.clock,lifecycle:options.lifecycle ?? AppState});
  const current = useRef<GameState|null>(null), mounted = useRef(false), loaded = useRef(false);
  const focused = useRef(options.focused), active = useRef(dependencies.current.lifecycle.currentState === 'active');
  const generation = useRef(0), choosing = useRef(false), confirming = useRef(false);
  const ai = useRef<Task|null>(null), hint = useRef<Task|null>(null), selection = useRef<string[]>([]);
  const saveSequence = useRef(0), feedbackSequence = useRef(0);
  const [state,setState] = useState<PlayerObservation|null>(null);
  const [difficulty,setDifficulty] = useState<Difficulty|null>(null);
  const [loading,setLoading] = useState(true), [choosingDifficulty,setChoosingDifficulty] = useState(false);
  const [confirmRestartVisible,setConfirmRestartVisible] = useState(false);
  const [restoreIssue,setRestoreIssue] = useState<'invalid'|'readError'|null>(null);
  const [saveError,setSaveError] = useState(false), [message,setMessage] = useState('');
  const [thinking,setThinking] = useState(false), [hinting,setHinting] = useState(false);
  const [selectedIds,setSelectedIds] = useState<string[]>([]), [suggestedPass,setSuggestedPass] = useState(false);
  const [epoch,setEpoch] = useState(0);

  function cancelHint() {
    if (hint.current) hint.current.signal.aborted = true;
    hint.current = null;
    if (mounted.current) setHinting(false);
  }
  function invalidate() {
    generation.current++;
    if (ai.current) ai.current.signal.aborted = true;
    ai.current = null; cancelHint();
    if (mounted.current) setThinking(false);
  }
  function select(ids: string[]) { selection.current = ids; setSelectedIds(ids); }
  function available() {
    return mounted.current && loaded.current && focused.current && active.current && !choosing.current && !confirming.current;
  }
  function live(task: Task) {
    const game = current.current;
    return available() && !!game && task.generation === generation.current && !task.signal.aborted
      && task.gameId === game.gameId && task.dealId === game.dealId && task.revision === game.revision && task.seat === game.currentSeat;
  }
  function newTask(game: GameState): Task {
    return {generation:generation.current,gameId:game.gameId,dealId:game.dealId,revision:game.revision,seat:game.currentSeat,signal:{aborted:false}};
  }
  function persist(game: GameState) {
    const sequence = ++saveSequence.current;
    // Enqueue before returning: an immediate reader must see this write barrier.
    try { dependencies.current.storage.saveGame(game).then(() => feedback(false),() => feedback(true)); }
    catch { feedback(true); }
    function feedback(failed: boolean) {
      if (!mounted.current || sequence < feedbackSequence.current) return;
      feedbackSequence.current = sequence; setSaveError(failed);
    }
  }
  function publish(game: GameState, save: boolean) {
    invalidate(); current.current = game;
    setState(buildObservation(game,0,{includeLegalActions:false}));setDifficulty(game.difficulty);
    select([]);setSuggestedPass(false);setMessage('');
    if (save) persist(game);
  }
  function commit(action: Action): boolean {
    if (!current.current || !available()) return false;
    const result = applyAction(current.current,action,{random:dependencies.current.random});
    if (!result.ok) {setMessage(result.reason ?? '这个操作暂时不可用。');return false;}
    publish(result.state,true);return true;
  }

  useLayoutEffect(() => {
    focused.current = options.focused;
    if (!options.focused) invalidate();
  },[options.focused]);

  useEffect(() => {
    let alive = true; mounted.current = true;
    const subscription = dependencies.current.lifecycle.addEventListener('change',next => {
      const nextActive = next === 'active';
      if (nextActive === active.current) return;
      active.current = nextActive;
      if (!nextActive) invalidate();
      setEpoch(value => value+1);
    });
    void dependencies.current.storage.loadGame().catch(() => ({status:'readError'} as const)).then(result => {
      if (!alive) return;
      loaded.current = true;
      if (result.status === 'valid') publish(result.state,false);
      else {choosing.current = true;setChoosingDifficulty(true);setRestoreIssue(result.status === 'missing' ? null : result.status);}
      setLoading(false);
    });
    return () => {alive=false;mounted.current=false;loaded.current=false;invalidate();subscription.remove();};
  },[]);

  useEffect(() => {
    const game = current.current;
    if (!available() || !game || game.phase === 'finished' || game.currentSeat === 0 || ai.current) return;
    const task = newTask(game);ai.current=task;setThinking(true);
    const observation = buildObservation(game,game.currentSeat,{includeLegalActions:false});
    const run = async () => {
      let action: Action|null = null;
      try {
        if (!live(task)) return;
        action = await dependencies.current.decide(observation,{difficulty:game.difficulty,signal:task.signal,
          random:dependencies.current.policyRandom,clock:dependencies.current.clock});
      } catch { /* The same guarded turn can use a cheap legal fallback. */ }
      if (ai.current !== task || !live(task)) return;
      ai.current=null;setThinking(false);
      if (!action || !commit(action)) commit(fallback(current.current!));
    };
    void run();
  },[state?.gameId,state?.dealId,state?.revision,loading,options.focused,epoch,choosingDifficulty,confirmRestartVisible]);

  const humanTurn = mounted.current && loaded.current && options.focused && active.current
    && !choosing.current && !confirming.current && state?.currentSeat === 0 && state.phase !== 'finished';
  return {
    state,difficulty,loading,choosingDifficulty,confirmRestartVisible,restoreIssue,saveError,message,
    thinking,hinting,selectedIds,suggestedPass,
    permissions:{humanTurn,canPass:!!humanTurn && state?.phase === 'playing' && state.target !== null,
      canHint:!!humanTurn && state?.phase === 'playing' && !hinting},
    toggleCard(id: string) {
      if (!available() || current.current?.currentSeat !== 0 || current.current.phase !== 'playing'
        || !current.current.hands[0].some(card => card.id === id)) return false;
      cancelHint();setSuggestedPass(false);
      select(selection.current.includes(id) ? selection.current.filter(value => value !== id) : [...selection.current,id]);
      return true;
    },
    submit(type: ActionType) {
      const game=current.current;
      if (!available() || !game || game.currentSeat !== 0) return false;
      cancelHint();return commit({type,seat:0,gameId:game.gameId,dealId:game.dealId,revision:game.revision,
        ...(type === 'play' ? {cardIds:[...selection.current]} : {})});
    },
    requestHint() {
      const game=current.current;
      if (!available() || !game || game.currentSeat !== 0 || game.phase !== 'playing' || hint.current) return;
      const task=newTask(game);hint.current=task;setHinting(true);setMessage('');
      const observation=buildObservation(game,0,{includeLegalActions:false});
      void Promise.resolve().then(() => live(task) ? dependencies.current.hint(observation,{difficulty:game.difficulty,signal:task.signal,
        random:dependencies.current.policyRandom,clock:dependencies.current.clock}) : null).then(action => {
        if (hint.current !== task || !live(task)) return;
        if (!action || !applyAction(current.current!,action).ok) {setMessage('暂时无法生成提示，请重新选择。');return;}
        select(action.type === 'play' ? [...action.cardIds!] : []);setSuggestedPass(action.type === 'pass');
      },() => {if (hint.current === task && live(task)) setMessage('暂时无法生成提示，请重新选择。');}).finally(() => {
        if (hint.current !== task) return;
        hint.current=null;if (mounted.current) setHinting(false);
      });
    },
    requestRestart() {
      if (!loaded.current || !current.current) return;
      confirming.current=true;invalidate();setConfirmRestartVisible(true);
    },
    cancelRestart() {confirming.current=false;setConfirmRestartVisible(false);},
    confirmRestart() {
      if (!confirming.current) return;
      invalidate();confirming.current=false;choosing.current=true;
      setConfirmRestartVisible(false);setChoosingDifficulty(true);
    },
    startNewGame(nextDifficulty: Difficulty) {
      if (!mounted.current || !loaded.current || !focused.current || !active.current || !choosing.current) return;
      try {
        const game=createGame({difficulty:nextDifficulty,random:dependencies.current.random,gameId:`doudizhu-${Date.now()}-${++gameSequence}`});
        choosing.current=false;setChoosingDifficulty(false);setRestoreIssue(null);publish(game,true);
      } catch {setMessage('暂时无法开始，请再试一次。');}
    },
  };
}
