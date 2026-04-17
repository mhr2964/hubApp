import { useRef, useLayoutEffect, useEffect, useState } from 'react';
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

const SIZE_PX = {
  small:  { w: 220, h: 180 },
  medium: { w: 340, h: 260 },
  large:  { w: 520, h: 340 },
};

const GAP = 12;
const SPEED = 0.25;

function pack(blocks, cw) {
  const result = [];
  let x = GAP, y = GAP, rowH = 0;

  for (const block of blocks) {
    const size = block.size || TYPE_DEFAULT_SIZE[block.type] || 'medium';
    const { w, h } = SIZE_PX[size];

    if (x > GAP && x + w + GAP > cw) {
      y += rowH + GAP;
      x = GAP;
      rowH = 0;
    }

    const speed = SPEED * (0.6 + Math.random() * 0.8);
    result.push({
      id: block.id,
      block,
      x, y, w, h,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() < 0.5 ? 1 : -1) * speed,
    });

    x += w + GAP;
    rowH = Math.max(rowH, h);
  }

  return result;
}

function resolveCollision(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (ox <= 0 || oy <= 0) return;

  if (ox < oy) {
    const push = ox / 2 + 0.5;
    if (a.x < b.x) { a.x -= push; b.x += push; } else { a.x += push; b.x -= push; }
    [a.vx, b.vx] = [b.vx, a.vx];
  } else {
    const push = oy / 2 + 0.5;
    if (a.y < b.y) { a.y -= push; b.y += push; } else { a.y += push; b.y -= push; }
    [a.vy, b.vy] = [b.vy, a.vy];
  }
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
  const containerRef = useRef(null);
  const domRefs = useRef({});
  const physics = useRef([]);
  const [items, setItems] = useState([]);

  useLayoutEffect(() => {
    if (!containerRef.current || blocks.length === 0) return;
    const cw = containerRef.current.clientWidth;
    physics.current = pack(blocks, cw);
    setItems([...physics.current]);
  }, [blocks]);

  useEffect(() => {
    if (items.length === 0) return;
    let rafId;
    const MAX_V = SPEED * 4;

    const tick = () => {
      const state = physics.current;
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;

      for (const item of state) {
        item.x += item.vx;
        item.y += item.vy;

        if (item.x < 0)           { item.x = 0;          item.vx =  Math.abs(item.vx); }
        if (item.x + item.w > cw) { item.x = cw - item.w; item.vx = -Math.abs(item.vx); }
        if (item.y < 0)           { item.y = 0;          item.vy =  Math.abs(item.vy); }
        if (item.y + item.h > ch) { item.y = ch - item.h; item.vy = -Math.abs(item.vy); }

        if (Math.abs(item.vx) > MAX_V) item.vx = Math.sign(item.vx) * MAX_V;
        if (Math.abs(item.vy) > MAX_V) item.vy = Math.sign(item.vy) * MAX_V;

        const domEl = domRefs.current[item.id];
        if (domEl) domEl.style.transform = `translate(${item.x}px, ${item.y}px)`;
      }

      for (let i = 0; i < state.length; i++) {
        for (let j = i + 1; j < state.length; j++) {
          resolveCollision(state[i], state[j]);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [items]);

  if (blocks.length === 0) return <p className="empty-state">nothing here yet.</p>;

  return (
    <div ref={containerRef} className="block-grid">
      {items.map(item => (
        <div
          key={item.id}
          ref={el => { if (el) domRefs.current[item.id] = el; }}
          className="block-item"
          style={{ width: item.w, height: item.h, transform: `translate(${item.x}px, ${item.y}px)` }}
        >
          <BlockComponent block={item.block} />
        </div>
      ))}
    </div>
  );
}
