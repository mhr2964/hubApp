// Central registry for all block types on the server side.
// Add a new type here AND in client/src/blockRegistry.js AND in block-types.json.
// The startup assertion below catches any of the three drifting.
const SHARED_TYPES = require('../block-types.json');

const BLOCK_REGISTRY = {
  document: {
    filename:     'documents',
    searchFields: b => [b.title, b.preview],
  },
  photo: {
    filename:     'photos',
    searchFields: b => [b.title, b.caption, ...(b.tags ?? [])],
  },
  audio: {
    filename:     'audio',
    searchFields: b => [b.title, b.description, ...(b.tags ?? [])],
  },
  link: {
    filename:     'links',
    searchFields: b => [b.title, b.description],
  },
  project: {
    filename:     'projects',
    searchFields: b => [b.title, b.description, ...(b.stack ?? []), ...(b.tags ?? [])],
  },
};

const DEFAULT_SEARCH_FIELDS = b => [b.title];

const registered = Object.keys(BLOCK_REGISTRY);
if (registered.length !== SHARED_TYPES.length || registered.some((t, i) => t !== SHARED_TYPES[i])) {
  throw new Error(
    `Server block registry drift: registered=[${registered.join(',')}] but block-types.json=[${SHARED_TYPES.join(',')}]`,
  );
}

module.exports = { BLOCK_REGISTRY, DEFAULT_SEARCH_FIELDS };
