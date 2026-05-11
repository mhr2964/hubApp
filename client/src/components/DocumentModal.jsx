import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from '../utils/block';
import { modalState } from '../state/modalState';
import './DocumentModal.css';

export default function DocumentModal({ block, onClose }) {
  const documentId = block.id;
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/blocks/document/${documentId}`, { signal: controller.signal })
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
  }, [documentId]);

  // Focus close button once content is ready
  useEffect(() => {
    if (!loading && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [loading]);

  // Escape key closes
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Restore focus to the element that opened the modal on close
  useEffect(() => {
    const prev = document.activeElement;
    return () => {
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, []);

  // Pause grid auto-promote while this modal is mounted
  useEffect(() => {
    modalState.open();
    return () => modalState.close();
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="doc-modal-backdrop" onClick={handleBackdropClick}>
      <div className="doc-modal-card" role="dialog" aria-modal="true" aria-label={block?.title ?? doc?.title ?? 'Document'}>
        <div className="doc-modal-header">
          <div className="doc-modal-meta">
            <h2 className="doc-modal-title">{block?.title ?? doc?.title}</h2>
            <span className="doc-modal-date">{formatDate(block?.date ?? doc?.date)}</span>
          </div>
          <button type="button" className="doc-modal-close" ref={closeBtnRef} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="doc-modal-body">
          {loading && <p className="doc-modal-status">loading...</p>}
          {error && <p className="doc-modal-status doc-modal-error">{error}</p>}
          {doc && (
            <div
              className="doc-modal-content"
              dangerouslySetInnerHTML={{ __html: doc.body }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
