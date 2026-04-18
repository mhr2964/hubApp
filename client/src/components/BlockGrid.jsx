import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
const AUTO_PROMOTE_INTERVAL = 8000;
const FLIP_DURATION = 400;

function BlockComponent({ block }) {
  const Component = BLOCK_COMPONENTS[block.type];
  return Component ? <Component block={block} /> : null;
}

function SortableBlock({ block, isActive, flipRefCallback }) {
  const span = getSpan(block);
  const { duration, delay, amplitude } = floatParams(block.id);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

  return (
    <div
      ref={(el) => { setNodeRef(el); flipRefCallback(block.id, el); }}
      className="block-item"
      style={{
        gridColumn: `span ${span}`,
        opacity: isActive ? 0 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
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

  // FLIP animation state
  const flipRefs = useRef({});
  const flipPrev = useRef({});
  const flipInProgress = useRef(false);
  const activeIdRef = useRef(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => setBlocks(propBlocks), [propBlocks]);

  const sensors = useSensors(useSensor(PointerSensor, POINTER_SENSOR_OPTIONS));
  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  const flipRefCallback = useCallback((id, el) => {
    flipRefs.current[id] = el;
  }, []);

  const captureForFlip = useCallback(() => {
    const rects = {};
    Object.entries(flipRefs.current).forEach(([id, el]) => {
      if (el) rects[id] = el.getBoundingClientRect();
    });
    flipPrev.current = rects;
  }, []);

  // After each blocks update, run FLIP for any displaced elements.
  // Skip during active drag — dnd-kit's transform/transition handles that.
  useLayoutEffect(() => {
    if (activeIdRef.current) return;
    const prev = flipPrev.current;
    if (!Object.keys(prev).length) return;

    let animated = false;
    Object.entries(flipRefs.current).forEach(([id, el]) => {
      if (!el || !prev[id]) return;
      const curr = el.getBoundingClientRect();
      const dx = prev[id].left - curr.left;
      const dy = prev[id].top - curr.top;
      if (!dx && !dy) return;

      animated = true;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = `transform ${FLIP_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          el.style.transform = '';
        });
      });
    });

    if (animated) {
      flipInProgress.current = true;
      setTimeout(() => { flipInProgress.current = false; }, FLIP_DURATION + 50);
    }
    flipPrev.current = {};
  }, [blocks]);

  // Periodically promote the last block to position 0.
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeIdRef.current || flipInProgress.current) return;
      captureForFlip();
      setBlocks(prev => prev.length < 2 ? prev : arrayMove(prev, prev.length - 1, 0));
    }, AUTO_PROMOTE_INTERVAL);
    return () => clearInterval(interval);
  }, [captureForFlip]);

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id);
    savedOrder.current = blocks;
  }, [blocks]);

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
            <SortableBlock
              key={block.id}
              block={block}
              isActive={block.id === activeId}
              flipRefCallback={flipRefCallback}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeBlock && <OverlayBlock block={activeBlock} />}
      </DragOverlay>
    </DndContext>
  );
}
