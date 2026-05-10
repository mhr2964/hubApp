# Changelog — hub-app

## 2026-05-10
- **Centralized block-type registry; fixed drag & navigation conflicts.** Reducing friction for new block types from 6 edits across 4 files to a single registry entry. Extracted auto-rotate interval to a reusable hook, fixed listener accumulation on repeated drags, and prevented link blocks from both reordering and navigating on drag.
  Files: server/blockRegistry.js, client/src/blockRegistry.js, client/src/hooks/useAutoPromote.js, client/src/components/BlockGrid.jsx, client/src/components/blocks/LinkBlock.jsx
- **Polish: search clarity, idle-aware auto-promote, drag recovery, and a11y fixes.** Search input shows a clear button when active. Auto-promote pauses during active mouse interaction and resumes when idle, replacing the rigid 8s rotation. Tab-switches or focus loss mid-drag now cancel cleanly instead of leaving `activeId` stuck. Added visual grab/grabbing cursor, marked cards as `role="listitem"` to suppress false screen-reader actions, and fixed a LinkBlock regression where `stopPropagation` prevented drag detection. Internal fixes include unmount cleanup for click suppressors, ref stability in auto-promote callbacks, and early type-mismatch warnings.
  Files: client/src/components/BlockGrid.jsx, client/src/components/blocks/LinkBlock.jsx, client/src/hooks/useAutoPromote.js
