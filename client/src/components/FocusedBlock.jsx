import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { resolveMediaSrc, formatDate } from '../utils/block';
import { modalState } from '../state/modalState';
import './blocks/blocks.css';
import './FocusedBlock.css';

const SOUNDCLOUD_BASE = 'https://w.soundcloud.com/player/';

function getSoundCloudEmbed(url) {
  const params = new URLSearchParams({
    url,
    color: '#aaaaaa',
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'false',
    show_reposts: 'false',
    show_teaser: 'false',
  });
  return `${SOUNDCLOUD_BASE}?${params}`;
}

function Shell({ title, subtitle, onClose, wide, children, footer }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (closeBtnRef.current) closeBtnRef.current.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    modalState.open();
    return () => modalState.close();
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fb-backdrop" onClick={handleBackdrop}>
      <div
        className={`fb-card${wide ? ' fb-card--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Block'}
      >
        <div className="fb-header">
          <div className="fb-header-meta">
            {title && <h2 className="fb-title">{title}</h2>}
            {subtitle && <p className="fb-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="fb-close" ref={closeBtnRef} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="fb-body">
          {children}
        </div>
        {footer && <div className="fb-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

function FocusedDocument({ block, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/blocks/document/${block.id}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server error: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setDoc(data);
        setLoading(false);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [block.id]);

  return (
    <Shell title={block.title} subtitle={formatDate(block.date)} onClose={onClose}>
      <div className="fb-doc-body">
        {loading && <p className="fb-status">loading...</p>}
        {error && <p className="fb-status fb-status--error">{error}</p>}
        {doc && (
          <div className="fb-doc-content" dangerouslySetInnerHTML={{ __html: doc.body }} />
        )}
      </div>
    </Shell>
  );
}

function FocusedPhoto({ block, onClose }) {
  return (
    <Shell title={block.title} onClose={onClose}>
      <img
        src={resolveMediaSrc(block.src)}
        alt={block.alt || block.title}
        className="fb-photo-img"
      />
      {block.caption && (
        <div className="fb-photo-caption">
          <p>{block.caption}</p>
        </div>
      )}
    </Shell>
  );
}

function FocusedAudio({ block, onClose }) {
  const isEmbed = block.src?.startsWith('http');
  const albumArtSrc = resolveMediaSrc(block.album_art);

  return (
    <Shell title={block.title} onClose={onClose}>
      <div className="fb-audio-body">
        <div className="fb-audio-top">
          {albumArtSrc && (
            <img src={albumArtSrc} alt="" className="fb-audio-art" />
          )}
          <div className="fb-audio-info">
            {block.artist && <p className="fb-audio-artist">{block.artist}</p>}
            {block.description && <p className="fb-audio-description">{block.description}</p>}
          </div>
        </div>
        {isEmbed ? (
          <iframe
            className="fb-audio-embed"
            scrolling="no"
            allow="autoplay"
            src={getSoundCloudEmbed(block.src)}
            style={{ border: 'none' }}
          />
        ) : (
          <audio className="fb-audio-player" controls src={resolveMediaSrc(block.src)} />
        )}
      </div>
    </Shell>
  );
}

function FocusedLink({ block, onClose }) {
  let domain = '';
  try { domain = new URL(block.url).hostname; } catch { /* invalid url */ }

  return (
    <Shell title={block.title} onClose={onClose}>
      <div className="fb-link-body">
        {block.og_image && (
          <img src={block.og_image} alt="" className="fb-link-og" />
        )}
        <div className="fb-link-row">
          {block.favicon && <img src={block.favicon} alt="" className="fb-link-favicon" />}
          {domain && <p className="fb-link-domain">{domain}</p>}
        </div>
        {block.description && <p className="fb-link-description">{block.description}</p>}
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="fb-link-open"
        >
          open link ↗
        </a>
      </div>
    </Shell>
  );
}

function FocusedProject({ block, onClose }) {
  return (
    <Shell
      title={block.title}
      onClose={onClose}
      footer={
        <button type="button" className="fb-back" onClick={onClose}>
          ← back to gallery
        </button>
      }
    >
      <div className="fb-project-body">
        {block.status && (
          <div className="fb-project-status-row">
            <span className={`project-status project-status-${block.status}`}>
              {block.status}
            </span>
          </div>
        )}
        {block.description && <p className="fb-project-description">{block.description}</p>}
        {block.stack?.length > 0 && (
          <div className="fb-project-stack">
            {block.stack.map(tech => (
              <span key={tech} className="fb-project-stack-tag">{tech}</span>
            ))}
          </div>
        )}
        <div className="fb-project-links">
          {block.live_url && (
            <a href={block.live_url} target="_blank" rel="noopener noreferrer" className="fb-project-link-btn">
              live ↗
            </a>
          )}
          {block.repo_url && (
            <a href={block.repo_url} target="_blank" rel="noopener noreferrer" className="fb-project-link-btn">
              repo ↗
            </a>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default function FocusedBlock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleClose = () => navigate('/');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/blocks', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const found = Array.isArray(data) ? data.find(b => b.id === id) : null;
        if (!found) {
          setError('not-found');
        } else {
          setBlock(found);
        }
        setLoading(false);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="fb-backdrop">
        <p className="fb-status">loading...</p>
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="fb-backdrop">
        <p className="fb-status">
          block not found — <Link to="/">back to gallery</Link>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fb-backdrop">
        <p className="fb-status fb-status--error">
          {error} — <Link to="/">back to gallery</Link>
        </p>
      </div>
    );
  }

  if (!block) return null;

  switch (block.type) {
    case 'document': return <FocusedDocument block={block} onClose={handleClose} />;
    case 'photo':    return <FocusedPhoto    block={block} onClose={handleClose} />;
    case 'audio':    return <FocusedAudio    block={block} onClose={handleClose} />;
    case 'link':     return <FocusedLink     block={block} onClose={handleClose} />;
    case 'project':  return <FocusedProject  block={block} onClose={handleClose} />;
    default:
      return (
        <div className="fb-backdrop">
          <p className="fb-status">
            unknown block type — <Link to="/">back to gallery</Link>
          </p>
        </div>
      );
  }
}
