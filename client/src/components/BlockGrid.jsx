import { useState, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Stable pseudo-random float params derived from block id so they don't re-randomize on render
function floatParams(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    duration: `${3.5 + (h % 35) / 10}s`,
    delay:    `-${(h % 30) / 10}s`,
    amplitude: `${7 + (h % 7)}px`,
  };
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

function SortableBlock({ block }) {
  const size = block.size || TYPE_DEFAULT_SIZE[block.type] || 'medium';
  const { basis, grow, height } = SIZE_FLEX[size];
  const { duration, delay, amplitude } = floatParams(block.id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      className="block-item"
      style={{
        flexBasis: basis,
        flexGrow: grow,
        height,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <div
        className="block-float"
        style={{
          '--float-dur': duration,
          '--float-delay': delay,
          '--float-amp': amplitude,
          animationPlayState: isDragging ? 'paused' : 'running',
        }}
      >
        <BlockComponent block={block} />
      </div>
    </div>
  );
}

export default function BlockGrid({ blocks: propBlocks }) {
  const [blocks, setBlocks] = useState(propBlocks);
  useEffect(() => setBlocks(propBlocks), [propBlocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    setBlocks(prev => arrayMove(prev, oldIdx, newIdx));
  };

  if (blocks.length === 0) return <p className="empty-state">nothing here yet.</p>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={rectSortingStrategy}>
        <div className="block-grid">
          {blocks.map(block => (
            <SortableBlock key={block.id} block={block} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
