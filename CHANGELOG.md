# Changelog — hub-app

## 2026-05-10
- **Centralized block-type registry; fixed drag & navigation conflicts.** Reducing friction for new block types from 6 edits across 4 files to a single registry entry. Extracted auto-rotate interval to a reusable hook, fixed listener accumulation on repeated drags, and prevented link blocks from both reordering and navigating on drag.
  Files: server/blockRegistry.js, client/src/blockRegistry.js, client/src/hooks/useAutoPromote.js, client/src/components/BlockGrid.jsx, client/src/components/blocks/LinkBlock.jsx
