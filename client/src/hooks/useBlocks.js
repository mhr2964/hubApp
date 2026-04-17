import { useState, useEffect } from 'react';

export function useBlocks(filters) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const typeKey = filters.types.join(',');

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeKey.length > 0) params.set('type', typeKey);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.search) params.set('search', filters.search);

    setLoading(true);
    setError(null);

    fetch(`/api/blocks?${params}`)
      .then(res => res.json())
      .then(data => {
        setBlocks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [typeKey, filters.sort, filters.search]);

  return { blocks, loading, error };
}
