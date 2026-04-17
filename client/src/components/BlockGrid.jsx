import { useState, useEffect } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
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

// Grid is 12 columns. Spans determine proportional widths — no stretching.
const SIZE_GRID = {
  small:  { span: 3, height: '200px' },
  medium: { span: 4, height: '280px' },
  large:  { span: 6, height: '360px' },
};

// Stable pseudo-random float params per block id
function floatParams(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    duration:  `${7 + (h % 60) / 10}s`,
    delay:     `-${(h % 60) / 10}s`,
    amplitude: `${4 + (h % 3)}px`,
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
  const { span, height } = SIZE_GRID[size];
  const { duration, delay, amplitude } = floatParams(block.id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      className="block-item"
      style={{
        gridColumn: `span ${span}`,
        height,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <div
        className="block-float"
        style={{
          '--float-dur':   duration,
          '--float-delay': delay,
          '--float-amp':   amplitude,
          animationPlayState: isDragging ? 'paused' : 'running',
        }}
      >
        <BlockComponent block={block} />
      </div>
    </div>
  );
}

function OverlayBlock({ block }) {
  const size = block.size || TYPE_DEFAULT_SIZE[block.type] || 'medium';
  const { span, height } = SIZE_GRID[size];
  // Approximate pixel width for the overlay (grid not available outside DndContext portal)
  const approxWidth = `${(span / 12) * 100}%`;
  return (
    <div className="block-overlay" style={{ height, width: approxWidth }}>
      <BlockComponent block={block} />
    </div>
  );
}

export default function BlockGrid({ blocks: propBlocks }) {
  const [blocks, setBlocks] = useState(propBlocks);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => setBlocks(propBlocks), [propBlocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);

    // Suppress the browser click that fires on pointer-up after a drag
    const suppressClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('click', suppressClick, true);
    };
    document.addEventListener('click', suppressClick, true);

    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    setBlocks(prev => arrayMove(prev, oldIdx, newIdx));
  };

  const handleDragCancel = () => setActiveId(null);

  if (blocks.length === 0) return <p className="empty-state">nothing here yet.</p>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={blocks.map(b => b.id)} strategy={rectSortingStrategy}>
        <div className="block-grid">
          {blocks.map(block => (
            <SortableBlock key={block.id} block={block} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeBlock && <OverlayBlock block={activeBlock} />}
      </DragOverlay>
    </DndContext>
  );
}
