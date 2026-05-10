// Central registry for all block types on the server side.
// Add a new type here; api.js derives TYPE_FILES and SEARCH_FIELDS from this.
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

module.exports = { BLOCK_REGISTRY, DEFAULT_SEARCH_FIELDS };
