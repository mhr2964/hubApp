import { BLOCK_REGISTRY } from '../blockRegistry';
import './FilterBar.css';

// Order follows BLOCK_REGISTRY insertion order — do not edit directly
const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY);
const SORT_OPTIONS = ['recent', 'oldest'];

export default function FilterBar({ filters, onChange }) {
  const toggleType = type => {
    const types = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types });
  };

  const toggleSort = sort => {
    onChange({ ...filters, sort: filters.sort === sort ? null : sort });
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        {BLOCK_TYPES.map(type => (
          <button
            key={type}
            type="button"
            className={`filter-btn${filters.types.includes(type) ? ' active' : ''}`}
            onClick={() => toggleType(type)}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="filter-group">
        {SORT_OPTIONS.map(sort => (
          <button
            key={sort}
            type="button"
            className={`filter-btn${filters.sort === sort ? ' active' : ''}`}
            onClick={() => toggleSort(sort)}
          >
            {sort}
          </button>
        ))}
      </div>
      <div className="search-wrapper">
        <input
          className="search-input"
          type="text"
          placeholder="search..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
        {filters.search && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={() => onChange({ ...filters, search: '' })}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
