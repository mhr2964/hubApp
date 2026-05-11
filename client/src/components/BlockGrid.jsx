import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAutoPromote } from '../hooks/useAutoPromote';
import { floatParams } from '../utils/block';
import { BLOCK_REGISTRY, getSpan } from '../blockRegistry';
import { modalState } from '../state/modalState';
import './BlockGrid.css';

// Derived from BLOCK_REGISTRY — do not edit directly
const BLOCK_COMPONENTS = Object.fromEntries(
  Object.entries(BLOCK_REGISTRY).map(([type, entry]) => [type, entry.component]),
);

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 8 } };
const FLIP_DURATION = 400;

function BlockComponent({ block }) {
  const Component = BLOCK_COMPONENTS[block.type];
  if (!Component) {
    if (import.meta.env.DEV) {
      console.warn(`No client component registered for block type "${block.type}". Did you add it to client/src/blockRegistry.js?`);
    }
    return null;
  }
  return <Component block={block} />;
}

function SortableBlock({ block, isActive, flipRefCallback }) {
  const span = getSpan(block);
  const { duration, delay, amplitude } = floatParams(block.id);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  // dnd-kit spreads role="button" via attributes. Override to "listitem" so screen readers
  // don't announce a press action that doesn't exist (most cards aren't clickable).
  // Keyboard drag still works — KeyboardSensor listens via tabIndex, not via role.

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
      role="listitem"
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
  // Tracks the current one-shot click suppressor so repeated drags don't pile up listeners
  const suppressClickRef = useRef(null);
  // Timestamp of last mouse/scroll activity inside the grid — used to pause auto-promote
  const lastActivityRef = useRef(0);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => setBlocks(propBlocks), [propBlocks]);

  // Cleanup: if BlockGrid unmounts while a one-shot suppress-click listener is
  // still pending, remove it to avoid a stale closure capturing document clicks.
  useEffect(() => () => {
    if (suppressClickRef.current) {
      document.removeEventListener('click', suppressClickRef.current, true);
      suppressClickRef.current = null;
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
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

  const isAutoPromotePaused = useCallback(
    () => !!(activeIdRef.current || flipInProgress.current || Date.now() - lastActivityRef.current < 3000 || modalState.isOpen()),
    [],
  );

  useAutoPromote(setBlocks, { isPaused: isAutoPromotePaused, captureForFlip });

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

    // Clear any previously-registered suppressor before adding a new one,
    // so repeated drags don't accumulate listeners on document.
    if (suppressClickRef.current) {
      document.removeEventListener('click', suppressClickRef.current, true);
    }
    const suppressClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('click', suppressClick, true);
      // Only clear the ref if it still points to this handler — a rapid second
      // drag may have already replaced it with a newer suppressor.
      if (suppressClickRef.current === suppressClick) suppressClickRef.current = null;
    };
    suppressClickRef.current = suppressClick;
    document.addEventListener('click', suppressClick, true);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    if (savedOrder.current) setBlocks(savedOrder.current);
    savedOrder.current = null;
  }, []);

  // If the tab loses focus mid-drag, the pointerup never fires and activeId gets stuck,
  // permanently pausing auto-promote. Cancel the drag defensively on visibility/blur.
  useEffect(() => {
    const cancelIfDragging = () => {
      if (activeIdRef.current) handleDragCancel();
    };
    document.addEventListener('visibilitychange', cancelIfDragging);
    window.addEventListener('blur', cancelIfDragging);
    return () => {
      document.removeEventListener('visibilitychange', cancelIfDragging);
      window.removeEventListener('blur', cancelIfDragging);
    };
  }, [handleDragCancel]);

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
        <div
          className="block-grid"
          role="region"
          aria-label="sortable card gallery"
          onMouseMove={() => { lastActivityRef.current = Date.now(); }}
        >
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
