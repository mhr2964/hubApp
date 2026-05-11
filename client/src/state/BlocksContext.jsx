import { createContext, useContext, useState, useCallback, useRef } from 'react';

const BlocksContext = createContext(null);

export function BlocksProvider({ children }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a stable ref to the current filters so revalidate() can use them
  // without becoming a dependency of every consumer that calls it.
  const filtersRef = useRef({ types: [], sort: 'recent', search: '' });
  // Hold the AbortController for any in-flight fetch so revalidate() can
  // cancel it before issuing a new one.
  const controllerRef = useRef(null);

  const fetchBlocks = useCallback((filters) => {
    filtersRef.current = filters;
    controllerRef.current?.abort();

    const params = new URLSearchParams();
    const typeKey = [...filters.types].sort().join(',');
    if (typeKey.length > 0) params.set('type', typeKey);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.search) params.set('search', filters.search);

    const controller = new AbortController();
    controllerRef.current = controller;
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

    return controller;
  }, []);

  const revalidate = useCallback(() => {
    fetchBlocks(filtersRef.current);
  }, [fetchBlocks]);

  return (
    <BlocksContext.Provider value={{ blocks, loading, error, fetchBlocks, revalidate }}>
      {children}
    </BlocksContext.Provider>
  );
}

export function useBlocksContext() {
  const ctx = useContext(BlocksContext);
  if (!ctx) throw new Error('useBlocksContext must be used inside <BlocksProvider>');
  return ctx;
}
