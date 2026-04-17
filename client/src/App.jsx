import { useState } from 'react';
import FilterBar from './components/FilterBar';
import BlockGrid from './components/BlockGrid';
import { useBlocks } from './hooks/useBlocks';
import './App.css';

const DEFAULT_FILTERS = { types: [], sort: 'recent', search: '' };

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { blocks, loading, error } = useBlocks(filters);

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
