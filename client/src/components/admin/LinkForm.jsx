import { useState, useEffect, useRef } from 'react';

export default function LinkForm({ link, onSave, onCancel }) {
  const isEdit = link != null;

  const [title, setTitle] = useState(link?.title ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [description, setDescription] = useState(link?.description ?? '');
  const [ogImage, setOgImage] = useState(link?.og_image ?? '');
  const [favicon, setFavicon] = useState(link?.favicon ?? '');
  const [tags, setTags] = useState(
    Array.isArray(link?.tags) ? link.tags.join(', ') : (link?.tags ?? ''),
  );
  const [size, setSize] = useState(link?.size ?? 'small');

  const fetchControllerRef = useRef(null);
  // Re-entry guards — refs avoid the state-not-yet-rendered race when a fast user
  // (or test runner) fires multiple clicks before React applies disabled=true.
  const submittingRef = useRef(false);
  const fetchingRef = useRef(false);

  const [fetchStatus, setFetchStatus] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState(null);

  // Abort any in-flight metadata fetch on unmount
  useEffect(() => {
    return () => fetchControllerRef.current?.abort();
  }, []);

  // Reset form when switching between create and edit
  useEffect(() => {
    setTitle(link?.title ?? '');
    setUrl(link?.url ?? '');
    setDescription(link?.description ?? '');
    setOgImage(link?.og_image ?? '');
    setFavicon(link?.favicon ?? '');
    setTags(Array.isArray(link?.tags) ? link.tags.join(', ') : (link?.tags ?? ''));
    setSize(link?.size ?? 'small');
    setFetchStatus(null);
    setFetchError(false);
    setServerErrors([]);
    setSuccessMsg(null);
  }, [link]);

  const handleFetchMetadata = () => {
    if (!url || fetchingRef.current) return;
    fetchingRef.current = true;
    setFetching(true);
    setFetchStatus('fetching...');
    setFetchError(false);

    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    fetch('/api/blocks/link/from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({})).then(body => {
            setFetchStatus(body.error || "couldn't reach that URL — fill in manually");
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
        if (data.og_image) setOgImage(prev => prev || data.og_image);
        if (data.favicon) setFavicon(prev => prev || data.favicon);
        if (data.url) setUrl(data.url);
        setFetchStatus(null);
        setFetchError(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setFetchStatus("couldn't reach that URL — fill in manually");
        setFetchError(true);
      })
      .finally(() => {
        fetchingRef.current = false;
        setFetching(false);
      });
  };

  const buildPayload = () => {
    const payload = {
      title,
      url,
      size,
    };

    if (description) payload.description = description;
    if (ogImage) payload.og_image = ogImage;
    if (favicon) payload.favicon = favicon;

    const tagArr = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    if (tagArr.length > 0) payload.tags = tagArr;

    // Preserve the existing date on edit so the server doesn't default to today
    if (isEdit && link.date) payload.date = link.date;

    return payload;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setServerErrors([]);
    setSuccessMsg(null);
    setSubmitting(true);

    const endpoint = isEdit
      ? `/api/blocks/link/${link.id}`
      : '/api/blocks/link';
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
        setSuccessMsg('Link saved. Reload the home page to see it in the grid.');
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
        <label className="form-label" htmlFor="lf-url">url *</label>
        <div className="form-url-row">
          <input
            id="lf-url"
            className="form-input"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
            disabled={submitting}
          />
          <button
            type="button"
            className="fetch-btn"
            disabled={!url || fetching || submitting}
            onClick={handleFetchMetadata}
          >
            {fetching ? 'fetching...' : 'fetch metadata'}
          </button>
        </div>
        {fetchStatus && (
          <span className={`fetch-status${fetchError ? ' error' : ''}`}>
            {fetchStatus}
          </span>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="lf-title">title *</label>
        <input
          id="lf-title"
          className="form-input"
          type="text"
          placeholder="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="lf-description">description</label>
        <textarea
          id="lf-description"
          className="form-textarea"
          placeholder="short description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="lf-og-image">og image url</label>
        <input
          id="lf-og-image"
          className="form-input"
          type="url"
          placeholder="https://example.com/image.png"
          value={ogImage}
          onChange={e => setOgImage(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="lf-favicon">favicon url</label>
        <input
          id="lf-favicon"
          className="form-input"
          type="url"
          placeholder="https://example.com/favicon.ico"
          value={favicon}
          onChange={e => setFavicon(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="lf-tags">tags (comma-separated)</label>
        <input
          id="lf-tags"
          className="form-input"
          type="text"
          placeholder="design, tools, reference"
          value={tags}
          onChange={e => setTags(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="lf-size">size</label>
        <select
          id="lf-size"
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
        {successMsg && <span className="form-success">{successMsg}</span>}
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
          disabled={submitting || !title || !url}
        >
          {submitting ? 'saving...' : isEdit ? 'save changes' : 'create link'}
        </button>
      </div>
    </form>
  );
}
