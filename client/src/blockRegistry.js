// Central registry for all block types on the client side.
// Add a new type here AND in server/blockRegistry.js AND in block-types.json.
// The assertion at the bottom catches any of the three drifting.
import SHARED_TYPES from '../../block-types.json';
import DocumentBlock from './components/blocks/DocumentBlock';
import PhotoBlock from './components/blocks/PhotoBlock';
import AudioBlock from './components/blocks/AudioBlock';
import LinkBlock from './components/blocks/LinkBlock';
import ProjectBlock from './components/blocks/ProjectBlock';

// Order here determines filter-button order in FilterBar.
export const BLOCK_REGISTRY = {
  document: {
    component:   DocumentBlock,
    span:        { small: 6, medium: 6, large: 6 },
    defaultSize: 'medium',
  },
  photo: {
    component:   PhotoBlock,
    span:        { small: 3, medium: 6, large: 6 },
    defaultSize: 'medium',
  },
  audio: {
    component:   AudioBlock,
    span:        { small: 3, medium: 6, large: 6 },
    defaultSize: 'small',
  },
  link: {
    component:   LinkBlock,
    span:        { small: 3, medium: 3, large: 3 },
    defaultSize: 'small',
  },
  project: {
    component:   ProjectBlock,
    span:        { small: 3, medium: 6, large: 6 },
    defaultSize: 'medium',
  },
};

// Derived from BLOCK_REGISTRY — do not edit directly.
// Kept here so utils/block.js has no need to import the registry (breaks circular dep).
export const SPAN = Object.fromEntries(
  Object.entries(BLOCK_REGISTRY).map(([type, entry]) => [type, entry.span]),
);

const DEFAULT_SIZE = Object.fromEntries(
  Object.entries(BLOCK_REGISTRY).map(([type, entry]) => [type, entry.defaultSize]),
);

export function getSpan(block) {
  const size = block.size || DEFAULT_SIZE[block.type] || 'medium';
  return (SPAN[block.type] || {})[size] || 3;
}

const registered = Object.keys(BLOCK_REGISTRY);
if (
  registered.length !== SHARED_TYPES.length ||
  registered.some((t, i) => t !== SHARED_TYPES[i])
) {
  throw new Error(
    `Client block registry drift: registered=[${registered.join(',')}] but block-types.json=[${SHARED_TYPES.join(',')}]`,
  );
}
