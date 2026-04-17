import './blocks.css';

export default function LinkBlock({ block }) {
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block link-block"
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
