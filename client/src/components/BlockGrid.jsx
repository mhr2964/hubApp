import { useState, useEffect } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import { motion } from 'framer-motion';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import DocumentBlock from './blocks/DocumentBlock';
import PhotoBlock from './blocks/PhotoBlock';
import AudioBlock from './blocks/AudioBlock';
import LinkBlock from './blocks/LinkBlock';

const ResponsiveGrid = WidthProvider(GridLayout);

const COLS = 12;
const ROW_HEIGHT = 100;

const SIZE_UNITS = {
  small:  { w: 3, h: 2 },
  medium: { w: 4, h: 3 },
  large:  { w: 6, h: 4 },
};

const TYPE_DEFAULT_SIZE = {
  document: 'medium',
  photo:    'medium',
  audio:    'small',
  link:     'small',
};

function generateLayout(blocks) {
  const shuffled = [...blocks].sort(() => Math.random() - 0.5);
  const result = [];
  let x = 0, y = 0, rowH = 0;

  for (const block of shuffled) {
    const size = block.size || TYPE_DEFAULT_SIZE[block.type] || 'medium';
    const { w, h } = SIZE_UNITS[size] || SIZE_UNITS.medium;

    if (x + w > COLS) {
      y += rowH;
      x = 0;
      rowH = 0;
    }

    result.push({ i: block.id, x, y, w, h });
    x += w;
    rowH = Math.max(rowH, h);
  }

  return result;
}

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
  const [layout, setLayout] = useState([]);

  useEffect(() => {
    setLayout(generateLayout(blocks));
  }, [blocks]);

  if (blocks.length === 0) {
    return <p className="empty-state">nothing here yet.</p>;
  }

  return (
    <ResponsiveGrid
      layout={layout}
      cols={COLS}
      rowHeight={ROW_HEIGHT}
      isDraggable
      isResizable={false}
      compactType="horizontal"
      margin={[12, 12]}
      onLayoutChange={setLayout}
    >
      {blocks.map(block => (
        <div key={block.id} style={{ height: '100%' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            <BlockComponent block={block} />
          </motion.div>
        </div>
      ))}
    </ResponsiveGrid>
  );
}
