import { useState, useEffect } from 'react';

export default function AudioList({ onEdit, refreshKey }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/blocks?type=audio', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTracks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const handleDelete = track => {
    if (!window.confirm(`Delete "${track.title}"?`)) return;

    fetch(`/api/blocks/audio/${track.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        setTracks(prev => prev.filter(t => t.id !== track.id));
      })
      .catch(err => {
        setError(err.message);
      });
  };

  if (loading) return <p className="list-status">loading...</p>;
  if (error) return <p className="list-status error">{error}</p>;

  if (tracks.length === 0) {
    return <p className="link-list-empty">no audio yet — add one above</p>;
  }

  return (
    <ul className="link-list" role="list">
      {tracks.map(track => (
        <li key={track.id} className="link-row">
          <div className="link-row-info">
            <div className="link-row-title">{track.title}</div>
            {track.artist && (
              <div className="link-row-url">{track.artist}</div>
            )}
          </div>
          <div className="link-row-actions">
            <button
              type="button"
              className="link-row-btn"
              onClick={() => onEdit(track)}
            >
              edit
            </button>
            <button
              type="button"
              className="link-row-btn delete"
              onClick={() => handleDelete(track)}
            >
              delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
