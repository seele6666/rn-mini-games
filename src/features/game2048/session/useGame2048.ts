import { useEffect, useRef, useState } from 'react';
import { canMove, createGame, Direction, GameState, moveGame } from '../core/engine';
import { createSaveQueue, GameStorage } from '../persistence/saveQueue';
import { loadGame, saveGame } from '../persistence/storage';

// Shared across page mounts, so returning to the game waits for earlier writes.
const persistence = createSaveQueue({ loadGame, saveGame });

export function useGame2048(storage: GameStorage = persistence, random: () => number = Math.random) {
  const dependencies = useRef({ storage, random });
  const current = useRef<GameState | null>(null);
  const paused = useRef(false);
  const mounted = useRef(false);
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [winVisible, setWinVisible] = useState(false);

  function persist(next: GameState) {
    dependencies.current.storage.saveGame(next).then(
      () => { if (mounted.current) setSaveError(false); },
      () => { if (mounted.current) setSaveError(true); },
    );
  }

  useEffect(() => {
    let active = true;
    mounted.current = true;
    async function hydrate() {
      const saved = await dependencies.current.storage.loadGame().catch(() => null);
      if (!active) return;
      const next = saved ?? createGame(dependencies.current.random);
      current.current = next;
      setState(next);
      setLoading(false);
      if (!saved) persist(next);
    }
    void hydrate();
    return () => { active = false; mounted.current = false; };
  }, []);

  function move(direction: Direction) {
    if (!current.current || paused.current) return;
    const result = moveGame(current.current, direction, dependencies.current.random);
    if (!result.moved) return;
    current.current = result.state;
    setState(result.state);
    if (result.reached2048) {
      paused.current = true;
      setWinVisible(true);
    }
    persist(result.state);
  }

  function restart() {
    if (!current.current) return;
    const next = createGame(dependencies.current.random);
    current.current = next;
    paused.current = false;
    setState(next);
    setWinVisible(false);
    persist(next);
  }

  return {
    state, loading, saveError, winVisible, gameOver: state !== null && !canMove(state.board),
    move, restart,
    continueAfterWin() { paused.current = false; setWinVisible(false); },
  };
}
