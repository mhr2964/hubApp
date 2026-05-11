import { useState, useEffect, useRef } from 'react';

export default function ProjectForm({ project, onSave, onCancel }) {
  const isEdit = project != null;

  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState(project?.status ?? 'active');
  const [stack, setStack] = useState(
    Array.isArray(project?.stack) ? project.stack.join(', ') : (project?.stack ?? ''),
  );
  const [tags, setTags] = useState(
    Array.isArray(project?.tags) ? project.tags.join(', ') : (project?.tags ?? ''),
  );
  const [repoUrl, setRepoUrl] = useState(project?.repo_url ?? '');
  const [liveUrl, setLiveUrl] = useState(project?.live_url ?? '');
  const [size, setSize] = useState(project?.size ?? 'medium');

  const fetchControllerRef = useRef(null);
  const submittingRef = useRef(false);
  const fetchingRef = useRef(false);

  const [fetchStatus, setFetchStatus] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);

  useEffect(() => {
    return () => fetchControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    setTitle(project?.title ?? '');
    setDescription(project?.description ?? '');
    setStatus(project?.status ?? 'active');
    setStack(Array.isArray(project?.stack) ? project.stack.join(', ') : (project?.stack ?? ''));
    setTags(Array.isArray(project?.tags) ? project.tags.join(', ') : (project?.tags ?? ''));
    setRepoUrl(project?.repo_url ?? '');
    setLiveUrl(project?.live_url ?? '');
    setSize(project?.size ?? 'medium');
    setFetchStatus(null);
    setFetchError(false);
    setServerErrors([]);
  }, [project]);

  const handleFetchFromRepo = () => {
    if (!repoUrl || fetchingRef.current) return;
    fetchingRef.current = true;
    setFetching(true);
    setFetchStatus('fetching...');
    setFetchError(false);

    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    fetch('/api/blocks/project/from-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ repo_url: repoUrl }),
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({})).then(body => {
            setFetchStatus(body.error || "couldn't fetch repo — check the URL");
            setFetchError(true);
            return null;
          });
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (data.title) setTitle(prev => prev || data.title);
        if (data.description) setDescription(prev => prev || data.description);
        if (data.repo_url) setRepoUrl(data.repo_url);
        if (data.live_url) setLiveUrl(prev => prev || data.live_url);
        if (data.stack) {
          const incoming = Array.isArray(data.stack) ? data.stack.join(', ') : data.stack;
          setStack(prev => prev || incoming);
        }
        setFetchStatus(null);
        setFetchError(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setFetchStatus("couldn't fetch repo — check the URL");
        setFetchError(true);
      })
      .finally(() => {
        fetchingRef.current = false;
        setFetching(false);
      });
  };

  const buildPayload = () => {
    const payload = { title, status, size };

    if (description) payload.description = description;
    if (repoUrl) payload.repo_url = repoUrl;
    if (liveUrl) payload.live_url = liveUrl;

    const stackArr = stack.split(',').map(s => s.trim()).filter(Boolean);
    if (stackArr.length > 0) payload.stack = stackArr;

    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagArr.length > 0) payload.tags = tagArr;

    if (isEdit && project.date) payload.date = project.date;

    return payload;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setServerErrors([]);
    setSubmitting(true);

    const endpoint = isEdit
      ? `/api/blocks/project/${project.id}`
      : '/api/blocks/project';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(buildPayload()),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(body => {
            if (body && body.errors) {
              setServerErrors(body.errors);
            } else {
              setServerErrors([`Server error: ${res.status}`]);
            }
            return null;
          });
        }
        return res.json();
      })
      .then(saved => {
        if (!saved) return;
        onSave(saved);
      })
      .catch(() => {
        setServerErrors(['Network error. Check your connection.']);
      })
      .finally(() => {
        submittingRef.current = false;
        setSubmitting(false);
      });
  };

  return (
    <form className="link-form" onSubmit={handleSubmit}>
      {serverErrors.length > 0 && (
        <div className="form-errors">
          {serverErrors.map((err, i) => (
            <p key={i} className="form-error-item">{err}</p>
          ))}
        </div>
      )}

      <div className="form-field">
        <label className="form-label" htmlFor="pf-title">title *</label>
        <input
          id="pf-title"
          className="form-input"
          type="text"
          placeholder="project title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-description">description</label>
        <textarea
          id="pf-description"
          className="form-textarea"
          placeholder="short description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-repo-url">repo url</label>
        <div className="form-url-row">
          <input
            id="pf-repo-url"
            className="form-input"
            type="url"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            disabled={submitting}
          />
          <button
            type="button"
            className="fetch-btn"
            disabled={!repoUrl || fetching || submitting}
            onClick={handleFetchFromRepo}
          >
            {fetching ? 'fetching...' : 'fetch from github'}
          </button>
        </div>
        {fetchStatus && (
          <span className={`fetch-status${fetchError ? ' error' : ''}`}>
            {fetchStatus}
          </span>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-live-url">live url</label>
        <input
          id="pf-live-url"
          className="form-input"
          type="url"
          placeholder="https://yourproject.com"
          value={liveUrl}
          onChange={e => setLiveUrl(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-status">status</label>
        <select
          id="pf-status"
          className="form-select"
          value={status}
          onChange={e => setStatus(e.target.value)}
          disabled={submitting}
        >
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="shipped">shipped</option>
        </select>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-stack">stack (comma-separated)</label>
        <input
          id="pf-stack"
          className="form-input"
          type="text"
          placeholder="React, Node, Postgres"
          value={stack}
          onChange={e => setStack(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-tags">tags (comma-separated)</label>
        <input
          id="pf-tags"
          className="form-input"
          type="text"
          placeholder="web, open-source"
          value={tags}
          onChange={e => setTags(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-size">size</label>
        <select
          id="pf-size"
          className="form-select"
          value={size}
          onChange={e => setSize(e.target.value)}
          disabled={submitting}
        >
          <option value="small">small</option>
          <option value="medium">medium</option>
          <option value="large">large</option>
        </select>
      </div>

      <div className="form-footer">
        <button
          type="button"
          className="form-cancel-btn"
          onClick={onCancel}
          disabled={submitting}
        >
          cancel
        </button>
        <button
          type="submit"
          className="form-submit-btn"
          disabled={submitting || !title}
        >
          {submitting ? 'saving...' : isEdit ? 'save changes' : 'create project'}
        </button>
      </div>
    </form>
  );
}
