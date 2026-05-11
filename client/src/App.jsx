import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FilterBar from './components/FilterBar';
import BlockGrid from './components/BlockGrid';
import AdminPage from './components/AdminPage';
import FocusedBlock from './components/FocusedBlock';
import { useBlocksContext } from './state/BlocksContext';
import './App.css';

const DEFAULT_FILTERS = { types: [], sort: 'recent', search: '' };

function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { blocks, loading, error, fetchBlocks } = useBlocksContext();

  const typeKey = [...filters.types].sort().join(',');

  useEffect(() => {
    const controller = fetchBlocks(filters);
    return () => controller.abort();
  // fetchBlocks is stable (useCallback with no deps); typeKey/sort/search are
  // the real change signals.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeKey, filters.sort, filters.search]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">hub</h1>
        <FilterBar filters={filters} onChange={setFilters} />
      </header>
      <main className="app-main">
        {loading && <p className="status">loading...</p>}
        {error && <p className="status error">{error}</p>}
        {!loading && !error && <BlockGrid blocks={blocks} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Navigate to="/admin/links" replace />} />
      <Route path="/admin/:tab" element={<AdminPage />} />
      <Route path="/b/:id" element={<FocusedBlock />} />
    </Routes>
  );
}
