import { motion } from 'framer-motion';
import DocumentBlock from './blocks/DocumentBlock';
import PhotoBlock from './blocks/PhotoBlock';
import AudioBlock from './blocks/AudioBlock';
import LinkBlock from './blocks/LinkBlock';
import './BlockGrid.css';

const TYPE_DEFAULT_SIZE = {
  document: 'medium',
  photo:    'medium',
  audio:    'small',
  link:     'small',
};

const SIZE_FLEX = {
  small:  { basis: '200px', grow: 1, height: '180px' },
  medium: { basis: '320px', grow: 2, height: '260px' },
  large:  { basis: '500px', grow: 3, height: '340px' },
};

function BlockComponent({ block }) {
  switch (block.type) {
    case 'document': return <DocumentBlock block={block} />;
    case 'photo':    return <PhotoBlock block={block} />;
    case 'audio':    return <AudioBlock block={block} />;
    case 'link':     return <LinkBlock block={block} />;
    default:         return null;
  }
}

export default function BlockGrid({ blocks }) {
  if (blocks.length === 0) {
    return <p className="empty-state">nothing here yet.</p>;
  }

  return (
    <div className="block-grid">
      {blocks.map((block, i) => {
        const size = block.size || TYPE_DEFAULT_SIZE[block.type] || 'medium';
        const { basis, grow, height } = SIZE_FLEX[size];
        return (
          <motion.div
            key={block.id}
            className="block-item"
            style={{ flexBasis: basis, flexGrow: grow, height }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, delay: i * 0.03 }}
          >
            <BlockComponent block={block} />
          </motion.div>
        );
      })}
    </div>
  );
}
