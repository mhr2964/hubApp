import { useState, useEffect, useRef } from 'react';

export default function AudioForm({ audio, onSave, onCancel }) {
  const isEdit = audio != null;

  const [title, setTitle] = useState(audio?.title ?? '');
  const [description, setDescription] = useState(audio?.description ?? '');
  const [tags, setTags] = useState(
    Array.isArray(audio?.tags) ? audio.tags.join(', ') : (audio?.tags ?? ''),
  );
  const [artist, setArtist] = useState(audio?.artist ?? '');
  const [album, setAlbum] = useState(audio?.album ?? '');
  const [albumArt, setAlbumArt] = useState(audio?.album_art ?? '');
  const [size, setSize] = useState(audio?.size ?? 'small');
  const [file, setFile] = useState(null);

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);

  useEffect(() => {
    setTitle(audio?.title ?? '');
    setDescription(audio?.description ?? '');
    setTags(Array.isArray(audio?.tags) ? audio.tags.join(', ') : (audio?.tags ?? ''));
    setArtist(audio?.artist ?? '');
    setAlbum(audio?.album ?? '');
    setAlbumArt(audio?.album_art ?? '');
    setSize(audio?.size ?? 'small');
    setFile(null);
    setServerErrors([]);
  }, [audio]);

  const handleSubmit = e => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!isEdit && !file) {
      setServerErrors(['An audio file is required.']);
      return;
    }

    submittingRef.current = true;
    setServerErrors([]);
    setSubmitting(true);

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (artist) formData.append('artist', artist);
    if (album) formData.append('album', album);
    if (albumArt) formData.append('album_art', albumArt);
    formData.append('size', size);

    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagArr.length > 0) formData.append('tags', tagArr.join(','));

    if (isEdit && audio.date) formData.append('date', audio.date);

    const endpoint = isEdit ? `/api/blocks/audio/${audio.id}` : '/api/blocks/audio';
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
        <label className="form-label" htmlFor="af-file">
          {isEdit ? 'replace audio file' : 'audio file *'}
        </label>
        {isEdit && (
          <p className="form-hint">current file uploaded — pick a new one to replace</p>
        )}
        <input
          id="af-file"
          className="form-input"
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a"
          onChange={e => setFile(e.target.files[0] ?? null)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-title">title *</label>
        <input
          id="af-title"
          className="form-input"
          type="text"
          placeholder="track title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-description">description</label>
        <input
          id="af-description"
          className="form-input"
          type="text"
          placeholder="a short description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-artist">artist</label>
        <input
          id="af-artist"
          className="form-input"
          type="text"
          placeholder="artist name"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-album">album</label>
        <input
          id="af-album"
          className="form-input"
          type="text"
          placeholder="album name"
          value={album}
          onChange={e => setAlbum(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-album-art">album art URL</label>
        <input
          id="af-album-art"
          className="form-input"
          type="url"
          placeholder="https://example.com/cover.jpg"
          value={albumArt}
          onChange={e => setAlbumArt(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-tags">tags (comma-separated)</label>
        <input
          id="af-tags"
          className="form-input"
          type="text"
          placeholder="ambient, electronic"
          value={tags}
          onChange={e => setTags(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="af-size">size</label>
        <select
          id="af-size"
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
          {submitting ? 'saving...' : isEdit ? 'save changes' : 'create audio'}
        </button>
      </div>
    </form>
  );
}
