import { useState, useEffect } from 'react';

export function useBlocks(filters) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sort types before joining so ['photo','document'] and ['document','photo']
  // produce the same key and don't trigger redundant fetches.
  const typeKey = [...filters.types].sort().join(',');

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeKey.length > 0) params.set('type', typeKey);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.search) params.set('search', filters.search);

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/blocks?${params}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setBlocks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [typeKey, filters.sort, filters.search]);

  return { blocks, loading, error };
}
