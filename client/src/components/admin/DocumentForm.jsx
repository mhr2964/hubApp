import { useState, useEffect, useRef } from 'react';

export default function DocumentForm({ document, onSave, onCancel }) {
  const isEdit = document != null;

  const [title, setTitle] = useState(document?.title ?? '');
  const [body, setBody] = useState(document?.body ?? '');
  const [preview, setPreview] = useState(document?.preview ?? '');
  const [tags, setTags] = useState(
    Array.isArray(document?.tags) ? document.tags.join(', ') : (document?.tags ?? ''),
  );
  const [size, setSize] = useState(document?.size ?? 'medium');

  const submittingRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);

  useEffect(() => {
    setTitle(document?.title ?? '');
    setBody(document?.body ?? '');
    setPreview(document?.preview ?? '');
    setTags(Array.isArray(document?.tags) ? document.tags.join(', ') : (document?.tags ?? ''));
    setSize(document?.size ?? 'medium');
    setServerErrors([]);
  }, [document]);

  const buildPayload = () => {
    const payload = { title, body, size };

    if (preview) payload.preview = preview;

    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagArr.length > 0) payload.tags = tagArr;

    if (isEdit && document.date) payload.date = document.date;

    return payload;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setServerErrors([]);
    setSubmitting(true);

    const endpoint = isEdit
      ? `/api/blocks/document/${document.id}`
      : '/api/blocks/document';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(buildPayload()),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(b => {
            if (b && b.errors) {
              setServerErrors(b.errors);
            } else if (b && b.error) {
              setServerErrors([b.error]);
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
        <label className="form-label" htmlFor="df-title">title *</label>
        <input
          id="df-title"
          className="form-input"
          type="text"
          placeholder="document title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="df-body">body (markdown) *</label>
        <textarea
          id="df-body"
          className="form-textarea form-textarea--code"
          placeholder="# Heading&#10;&#10;Your markdown here..."
          value={body}
          onChange={e => setBody(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="df-preview">preview (short teaser)</label>
        <input
          id="df-preview"
          className="form-input"
          type="text"
          placeholder="A short italic teaser shown on the card (~80 chars)"
          value={preview}
          onChange={e => setPreview(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="df-tags">tags (comma-separated)</label>
        <input
          id="df-tags"
          className="form-input"
          type="text"
          placeholder="writing, reflection"
          value={tags}
          onChange={e => setTags(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="df-size">size</label>
        <select
          id="df-size"
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
          disabled={submitting || !title || !body}
        >
          {submitting ? 'saving...' : isEdit ? 'save changes' : 'create document'}
        </button>
      </div>
    </form>
  );
}
