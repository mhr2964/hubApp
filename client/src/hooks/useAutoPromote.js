import { useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export const AUTO_PROMOTE_INTERVAL = 8000;

// Periodically promotes the last block to position 0.
// isPaused() is called each tick — pass a stable function referencing refs so
// the interval never re-creates on render.
export function useAutoPromote(setBlocks, { isPaused, captureForFlip, interval = AUTO_PROMOTE_INTERVAL }) {
  useEffect(() => {
    const id = setInterval(() => {
      if (isPaused()) return;
      captureForFlip();
      setBlocks(prev => prev.length < 2 ? prev : arrayMove(prev, prev.length - 1, 0));
    }, interval);
    return () => clearInterval(id);
  }, [isPaused, captureForFlip, interval, setBlocks]);
}
