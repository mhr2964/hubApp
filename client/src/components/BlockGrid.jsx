import { useState, useEffect, useRef } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import DocumentBlock from './blocks/DocumentBlock';
import PhotoBlock from './blocks/PhotoBlock';
import AudioBlock from './blocks/AudioBlock';
import LinkBlock from './blocks/LinkBlock';
import './BlockGrid.css';

const SPAN = {
  link:     { small: 3, medium: 3, large: 3 },
  audio:    { small: 3, medium: 6, large: 6 },
  photo:    { small: 3, medium: 6, large: 9 },
  document: { small: 6, medium: 6, large: 9 },
};

const DEFAULT_SIZE = {
  link: 'small', audio: 'small', photo: 'medium', document: 'medium',
};

function getSpan(block) {
  const size = block.size || DEFAULT_SIZE[block.type] || 'medium';
  return (SPAN[block.type] || {})[size] || 3;
}

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

function SortableBlock({ block, isActive }) {
  const span = getSpan(block);
  const { duration, delay, amplitude } = floatParams(block.id);
  const { attributes, listeners, setNodeRef } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      className="block-item"
      style={{ gridColumn: `span ${span}`, opacity: isActive ? 0 : 1 }}
      {...attributes}
      {...listeners}
    >
      <div
        className="block-float"
        style={{
          '--float-dur':   duration,
          '--float-delay': delay,
          '--float-amp':   amplitude,
          animationPlayState: isActive ? 'paused' : 'running',
        }}
      >
        <BlockComponent block={block} />
      </div>
    </div>
  );
}

function OverlayBlock({ block }) {
  return (
    <div className="block-overlay">
      <BlockComponent block={block} />
    </div>
  );
}

export default function BlockGrid({ blocks: propBlocks }) {
  const [blocks, setBlocks] = useState(propBlocks);
  const [activeId, setActiveId] = useState(null);
  const savedOrder = useRef(null);

  useEffect(() => setBlocks(propBlocks), [propBlocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    savedOrder.current = blocks; // snapshot in case of cancel
  };

  // Commit each swap directly into state as you hover — stable base order
  // means nothing to oscillate against, no flicker.
  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      if (oldIdx === newIdx) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleDragEnd = () => {
    setActiveId(null);
    savedOrder.current = null;

    const suppressClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('click', suppressClick, true);
    };
    document.addEventListener('click', suppressClick, true);
    // blocks is already in final order — nothing else to do
  };

  const handleDragCancel = () => {
    setActiveId(null);
    if (savedOrder.current) setBlocks(savedOrder.current);
    savedOrder.current = null;
  };

  if (blocks.length === 0) return <p className="empty-state">nothing here yet.</p>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={blocks.map(b => b.id)} strategy={rectSortingStrategy}>
        <div className="block-grid">
          {blocks.map(block => (
            <SortableBlock key={block.id} block={block} isActive={block.id === activeId} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeBlock && <OverlayBlock block={activeBlock} />}
      </DragOverlay>
    </DndContext>
  );
}
