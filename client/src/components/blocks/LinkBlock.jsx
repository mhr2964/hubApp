import { useRef } from 'react';
import './blocks.css';

export default function LinkBlock({ block }) {
  const origin = useRef(null);

  const handleMouseDown = (e) => {
    origin.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e) => {
    if (!origin.current) return;
    const dx = Math.abs(e.clientX - origin.current.x);
    const dy = Math.abs(e.clientY - origin.current.y);
    if (dx > 6 || dy > 6) e.preventDefault();
  };

  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block link-block"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {block.og_image && <img src={block.og_image} className="link-og-image" alt="" />}
      <div className="link-content">
        <div className="link-header">
          {block.favicon && <img src={block.favicon} className="link-favicon" alt="" />}
          <h3 className="block-title">{block.title}</h3>
        </div>
        {block.description && <p className="link-description">{block.description}</p>}
      </div>
    </a>
  );
}
