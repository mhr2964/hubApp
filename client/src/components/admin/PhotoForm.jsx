import { useState, useEffect, useRef } from 'react';
import { resolveMediaSrc } from '../../utils/block';

export default function PhotoForm({ photo, onSave, onCancel }) {
  const isEdit = photo != null;

  const [title, setTitle] = useState(photo?.title ?? '');
  const [caption, setCaption] = useState(photo?.caption ?? '');
  const [alt, setAlt] = useState(photo?.alt ?? '');
  const [tags, setTags] = useState(
    Array.isArray(photo?.tags) ? photo.tags.join(', ') : (photo?.tags ?? ''),
  );
  const [size, setSize] = useState(photo?.size ?? 'medium');
  const [file, setFile] = useState(null);

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    setTitle(photo?.title ?? '');
    setCaption(photo?.caption ?? '');
    setAlt(photo?.alt ?? '');
    setTags(Array.isArray(photo?.tags) ? photo.tags.join(', ') : (photo?.tags ?? ''));
    setSize(photo?.size ?? 'medium');
    setFile(null);
    setServerErrors([]);
    setSuccessMsg(null);
  }, [photo]);

  const handleSubmit = e => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!isEdit && !file) {
      setServerErrors(['An image file is required.']);
      return;
    }

    submittingRef.current = true;
    setServerErrors([]);
    setSuccessMsg(null);
    setSubmitting(true);

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('title', title);
    if (caption) formData.append('caption', caption);
    if (alt) formData.append('alt', alt);
    formData.append('size', size);

    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagArr.length > 0) formData.append('tags', tagArr.join(','));

    if (isEdit && photo.date) formData.append('date', photo.date);

    const endpoint = isEdit ? `/api/blocks/photo/${photo.id}` : '/api/blocks/photo';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(endpoint, {
      method,
      credentials: 'include',
      body: formData,
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
        setSuccessMsg('Photo saved.');
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

  const previewSrc = isEdit && photo?.src ? resolveMediaSrc(photo.src) : null;

  return (
    <form className="link-form" onSubmit={handleSubmit}>
      {serverErrors.length > 0 && (
        <div className="form-errors">
          {serverErrors.map((err, i) => (
            <p key={i} className="form-error-item">{err}</p>
          ))}
        </div>
      )}

      {previewSrc && (
        <div className="form-field">
          <label className="form-label">current image</label>
          <img
            src={previewSrc}
            alt={photo.alt || photo.title}
            className="photo-preview"
          />
        </div>
      )}

      <div className="form-field">
        <label className="form-label" htmlFor="pf-file">
          {isEdit ? 'replace image' : 'image *'}
        </label>
        <input
          id="pf-file"
          className="form-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={e => setFile(e.target.files[0] ?? null)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-title">title *</label>
        <input
          id="pf-title"
          className="form-input"
          type="text"
          placeholder="photo title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-caption">caption</label>
        <input
          id="pf-caption"
          className="form-input"
          type="text"
          placeholder="a short caption"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-alt">alt text</label>
        <input
          id="pf-alt"
          className="form-input"
          type="text"
          placeholder="describe the image for accessibility"
          value={alt}
          onChange={e => setAlt(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="pf-tags">tags (comma-separated)</label>
        <input
          id="pf-tags"
          className="form-input"
          type="text"
          placeholder="landscape, travel"
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
          disabled={submitting || !title}
        >
          {submitting ? 'saving...' : isEdit ? 'save changes' : 'create photo'}
        </button>
      </div>
    </form>
  );
}
