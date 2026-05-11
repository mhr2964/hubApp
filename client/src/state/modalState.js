// Tiny shared signal so any open modal can pause grid auto-promote.
// Used by DocumentModal (sets on mount, clears on unmount) and BlockGrid (reads in isAutoPromotePaused).
let openCount = 0;
export const modalState = {
  open() { openCount += 1; },
  close() { openCount = Math.max(0, openCount - 1); },
  isOpen() { return openCount > 0; },
};
