import { useState, useEffect } from 'react';

export default function DocumentList({ onEdit, refreshKey, onDelete }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/blocks?type=document', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setDocuments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const handleDelete = doc => {
    if (!window.confirm(`Delete "${doc.title}"?`)) return;

    fetch(`/api/blocks/document/${doc.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        onDelete?.();
      })
      .catch(err => {
        setError(err.message);
      });
  };

  if (loading) return <p className="list-status">loading...</p>;
  if (error) return <p className="list-status error">{error}</p>;

  if (documents.length === 0) {
    return <p className="link-list-empty">no documents yet — add one above</p>;
  }

  return (
    <ul className="link-list" role="list">
      {documents.map(doc => (
        <li key={doc.id} className="link-row">
          <div className="link-row-info">
            <div className="link-row-title">{doc.title}</div>
            {doc.preview && (
              <div className="link-row-url doc-row-preview">{doc.preview}</div>
            )}
          </div>
          <div className="link-row-actions">
            <button
              type="button"
              className="link-row-btn"
              onClick={() => onEdit(doc)}
            >
              edit
            </button>
            <button
              type="button"
              className="link-row-btn delete"
              onClick={() => handleDelete(doc)}
            >
              delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
