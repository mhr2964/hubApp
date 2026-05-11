import { useState, useEffect } from 'react';
import { resolveMediaSrc } from '../../utils/block';

export default function PhotoList({ onEdit, refreshKey, onDelete }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/blocks?type=photo', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setPhotos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const handleDelete = photo => {
    if (!window.confirm(`Delete "${photo.title}"?`)) return;

    fetch(`/api/blocks/photo/${photo.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        setPhotos(prev => prev.filter(p => p.id !== photo.id));
        onDelete?.();
      })
      .catch(err => {
        setError(err.message);
      });
  };

  if (loading) return <p className="list-status">loading...</p>;
  if (error) return <p className="list-status error">{error}</p>;

  if (photos.length === 0) {
    return <p className="link-list-empty">no photos yet — add one above</p>;
  }

  return (
    <ul className="link-list" role="list">
      {photos.map(photo => (
        <li key={photo.id} className="link-row">
          {photo.src && (
            <img
              src={resolveMediaSrc(photo.src)}
              alt={photo.alt || photo.title}
              className="photo-thumb"
            />
          )}
          <div className="link-row-info">
            <div className="link-row-title">{photo.title}</div>
            {photo.caption && (
              <div className="link-row-url">{photo.caption}</div>
            )}
          </div>
          <div className="link-row-actions">
            <button
              type="button"
              className="link-row-btn"
              onClick={() => onEdit(photo)}
            >
              edit
            </button>
            <button
              type="button"
              className="link-row-btn delete"
              onClick={() => handleDelete(photo)}
            >
              delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
