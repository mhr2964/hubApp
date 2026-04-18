export const SPAN = {
  link:     { small: 3, medium: 3, large: 3 },
  audio:    { small: 3, medium: 6, large: 6 },
  photo:    { small: 3, medium: 6, large: 9 },
  document: { small: 6, medium: 6, large: 9 },
};

const DEFAULT_SIZE = {
  link: 'small', audio: 'small', photo: 'medium', document: 'medium',
};

export function getSpan(block) {
  const size = block.size || DEFAULT_SIZE[block.type] || 'medium';
  return (SPAN[block.type] || {})[size] || 3;
}

export function floatParams(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    duration:  `${7 + (h % 60) / 10}s`,
    delay:     `-${(h % 60) / 10}s`,
    amplitude: `${4 + (h % 3)}px`,
  };
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// Returns a usable src: passes absolute URLs through, prepends /api/content/ for relative paths.
export function resolveMediaSrc(src) {
  if (!src) return null;
  return src.startsWith('http') ? src : `/api/content/${src}`;
}
