import { formatDate } from '../../utils/block';
import './blocks.css';

export default function DocumentBlock({ block }) {
  return (
    <div className="block document-block">
      {block.preview && <p className="block-preview">{block.preview}</p>}
      <div className="block-footer">
        <h3 className="block-title">{block.title}</h3>
        <span className="block-date">{formatDate(block.date)}</span>
      </div>
    </div>
  );
}
