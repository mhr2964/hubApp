import { useState, useEffect } from 'react';

export default function ProjectList({ onEdit, refreshKey }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/blocks?type=project', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const handleDelete = project => {
    if (!window.confirm(`Delete "${project.title}"?`)) return;

    fetch(`/api/blocks/project/${project.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        setProjects(prev => prev.filter(p => p.id !== project.id));
      })
      .catch(err => {
        setError(err.message);
      });
  };

  if (loading) return <p className="list-status">loading...</p>;
  if (error) return <p className="list-status error">{error}</p>;

  if (projects.length === 0) {
    return <p className="link-list-empty">no projects yet — add one above</p>;
  }

  return (
    <ul className="link-list" role="list">
      {projects.map(project => (
        <li key={project.id} className="link-row">
          <div className="link-row-info">
            <div className="link-row-title project-row-title">
              {project.title}
              <span className={`project-status project-status-${project.status ?? 'active'}`}>
                {project.status ?? 'active'}
              </span>
            </div>
            {project.repo_url && (
              <div className="link-row-url">{project.repo_url}</div>
            )}
          </div>
          <div className="link-row-actions">
            <button
              type="button"
              className="link-row-btn"
              onClick={() => onEdit(project)}
            >
              edit
            </button>
            <button
              type="button"
              className="link-row-btn delete"
              onClick={() => handleDelete(project)}
            >
              delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
