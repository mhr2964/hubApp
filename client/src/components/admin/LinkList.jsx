import { useState, useEffect } from 'react';

export default function LinkList({ onEdit, refreshKey }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/blocks?type=link', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setLinks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const handleDelete = link => {
    if (!window.confirm(`Delete "${link.title}"?`)) return;

    fetch(`/api/blocks/link/${link.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        setLinks(prev => prev.filter(l => l.id !== link.id));
      })
      .catch(err => {
        setError(err.message);
      });
  };

  if (loading) return <p className="list-status">loading...</p>;
  if (error) return <p className="list-status error">{error}</p>;

  if (links.length === 0) {
    return <p className="link-list-empty">no links yet — add one above</p>;
  }

  return (
    <ul className="link-list" role="list">
      {links.map(link => (
        <li key={link.id} className="link-row">
          <div className="link-row-info">
            <div className="link-row-title">{link.title}</div>
            <div className="link-row-url">{link.url}</div>
          </div>
          <div className="link-row-actions">
            <button
              type="button"
              className="link-row-btn"
              onClick={() => onEdit(link)}
            >
              edit
            </button>
            <button
              type="button"
              className="link-row-btn delete"
              onClick={() => handleDelete(link)}
            >
              delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
