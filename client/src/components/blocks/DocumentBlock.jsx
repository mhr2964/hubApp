import { useState } from 'react';
import { formatDate } from '../../utils/block';
import DocumentModal from '../DocumentModal';
import './blocks.css';

export default function DocumentBlock({ block }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="block document-block document-block--clickable"
        onClick={() => setOpen(true)}
      >
        {block.preview && <p className="block-preview">{block.preview}</p>}
        <div className="block-footer">
          <h3 className="block-title">{block.title}</h3>
          <span className="block-date">{formatDate(block.date)}</span>
        </div>
      </div>

      {open && (
        <DocumentModal block={block} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
