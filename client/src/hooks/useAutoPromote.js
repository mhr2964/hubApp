import { useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export const AUTO_PROMOTE_INTERVAL = 8000;

// Periodically promotes the last block to position 0.
// isPaused and captureForFlip are stashed in refs so an unstable caller
// (non-memoized callbacks) does not rebuild the interval on every render.
export function useAutoPromote(setBlocks, { isPaused, captureForFlip, interval = AUTO_PROMOTE_INTERVAL }) {
  const isPausedRef = useRef(isPaused);
  const captureForFlipRef = useRef(captureForFlip);

  // Sync refs whenever the callbacks change, without touching the interval.
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { captureForFlipRef.current = captureForFlip; }, [captureForFlip]);

  useEffect(() => {
    const id = setInterval(() => {
      if (isPausedRef.current()) return;
      captureForFlipRef.current();
      setBlocks(prev => prev.length < 2 ? prev : arrayMove(prev, prev.length - 1, 0));
    }, interval);
    return () => clearInterval(id);
  }, [interval, setBlocks]);
}
