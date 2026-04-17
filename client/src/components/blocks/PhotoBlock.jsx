import './blocks.css';

export default function PhotoBlock({ block }) {
  return (
    <div className="block photo-block">
      <img src={`/api/content/${block.src}`} alt={block.alt || block.title} className="photo-img" />
      <div className="photo-overlay">
        <h3 className="block-title">{block.title}</h3>
        {block.caption && <p className="block-caption">{block.caption}</p>}
      </div>
    </div>
  );
}
