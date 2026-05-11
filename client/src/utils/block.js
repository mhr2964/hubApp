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

// Returns a usable src. Passes through absolute URLs and already-resolved server paths.
// Bare relative paths (e.g. legacy "photos/foo.jpg") get the /api/content/ prefix.
export function resolveMediaSrc(src) {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  if (src.startsWith('/')) return src;
  return `/api/content/${src}`;
}
