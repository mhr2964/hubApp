import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { getSpan, floatParams } from '../utils/block';
import DocumentBlock from './blocks/DocumentBlock';
import PhotoBlock from './blocks/PhotoBlock';
import AudioBlock from './blocks/AudioBlock';
import LinkBlock from './blocks/LinkBlock';
import './BlockGrid.css';

const BLOCK_COMPONENTS = {
  document: DocumentBlock,
  photo:    PhotoBlock,
  audio:    AudioBlock,
  link:     LinkBlock,
};

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 8 } };

function BlockComponent({ block }) {
  const Component = BLOCK_COMPONENTS[block.type];
  return Component ? <Component block={block} /> : null;
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

  const sensors = useSensors(useSensor(PointerSensor, POINTER_SENSOR_OPTIONS));

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id);
    savedOrder.current = blocks;
  }, [blocks]);

  // Commit each swap into state immediately — stable base avoids collision feedback loops.
  const handleDragOver = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      return oldIdx === newIdx ? prev : arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setActiveId(null);
    savedOrder.current = null;

    const suppressClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('click', suppressClick, true);
    };
    document.addEventListener('click', suppressClick, true);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    if (savedOrder.current) setBlocks(savedOrder.current);
    savedOrder.current = null;
  }, []);

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
