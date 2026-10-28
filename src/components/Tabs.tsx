import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTabsStore } from '@/state/tabsStore';
const TAB_W = 148;
const GAP = 4;
const PEEK = 56;
const DRAG_THRESHOLD = 4;

export function Tabs() {
  const tabs = useTabsStore(
    useShallow((s) => s.tabs.map((t) => ({ id: t.id, title: t.title, isDirty: t.isDirty }))),
  );
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActive = useTabsStore((s) => s.setActive);
  const closeTab = useTabsStore((s) => s.closeTab);
  const createTab = useTabsStore((s) => s.createTab);
  const setTitle = useTabsStore((s) => s.setTitle);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const dragState = useRef({
    isDown: false,
    didDrag: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft: sl, scrollWidth, clientWidth } = el;
    setCanScrollLeft(sl > 1);
    setCanScrollRight(sl + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    el.addEventListener('scroll', updateOverflow, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', updateOverflow); };
  }, [updateOverflow, tabs.length]);

  function scrollToTab(id: string) {
    const container = scrollRef.current;
    if (!container) return;
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const tabStart = idx * (TAB_W + GAP);
    const tabEnd = tabStart + TAB_W;
    const { scrollLeft, clientWidth } = container;
    if (tabStart < scrollLeft) {
      container.scrollTo({ left: Math.max(0, tabStart - PEEK), behavior: 'smooth' });
    } else if (tabEnd > scrollLeft + clientWidth) {
      container.scrollTo({ left: tabEnd - clientWidth + PEEK, behavior: 'smooth' });
    }
  }

  useEffect(() => { if (activeTabId) scrollToTab(activeTabId); }, [activeTabId]); // eslint-disable-line

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit =(id: string, currentTitle: string) => { setEditingId(id); setEditValue(currentTitle); };

  const commitEdit = () => {
    if (editingId) { const t = editValue.trim(); if (t) setTitle(editingId, t); }
    setEditingId(null);
    setEditValue('');
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { isDown: true, didDrag: false, startX: e.clientX, startScrollLeft: el.scrollLeft };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDown) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    if (!dragState.current.didDrag && Math.abs(dx) > DRAG_THRESHOLD) {
      dragState.current.didDrag = true;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    }
    if (dragState.current.didDrag) el.scrollLeft = dragState.current.startScrollLeft - dx;
  };

  const endDrag = () => {
    const el = scrollRef.current;
    if (el) { el.style.cursor = ''; el.style.userSelect = ''; }
    setTimeout(() => { dragState.current.isDown = false; dragState.current.didDrag = false; }, 0);
  };

  const onTabClick = (id: string) => {
    if (dragState.current.didDrag) return;
    if (editingId) return;
    setActive(id);
  };

  const scrollByArrow = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * (TAB_W + GAP) * 2, behavior: 'smooth' });
  };

  return (
    <div className="relative flex min-w-0 max-w-full items-center overflow-hidden">
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-8 w-20 transition-opacity"
        style={{
          background: 'linear-gradient(to right, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 96%, transparent) 34%, transparent 100%)',
          opacity: canScrollLeft ? 1 : 0,
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-8 w-20 transition-opacity"
        style={{
          background: 'linear-gradient(to left, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 96%, transparent) 34%, transparent 100%)',
          opacity: canScrollRight ? 1 : 0,
        }}
      />
      <div className="relative flex min-w-0 flex-1 items-center overflow-hidden">
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 transition-opacity"
          style={{ background: 'linear-gradient(to right, var(--color-paper) 0%, transparent 100%)', opacity: canScrollLeft ? 1 : 0 }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 transition-opacity"
          style={{ background: 'linear-gradient(to left, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 92%, transparent) 28%, transparent 100%)', opacity: canScrollRight ? 1 : 0 }}
        />
        <button
          onClick={() => scrollByArrow(-1)}
          className="absolute left-0 top-0 z-20 flex h-8 w-6 items-center justify-center rounded-soft bg-paper text-muted transition-opacity hover:text-text-primary hover:bg-surface disabled:pointer-events-none"
          aria-label="Scroll tabs left"
          disabled={!canScrollLeft}
          style={{ opacity: canScrollLeft ? 1 : 0 }}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => scrollByArrow(1)}
          className="absolute right-0 top-0 z-20 flex h-8 w-6 items-center justify-center rounded-soft bg-paper text-muted transition-opacity hover:text-text-primary hover:bg-surface disabled:pointer-events-none"
          aria-label="Scroll tabs right"
          disabled={!canScrollRight}
          style={{ opacity: canScrollRight ? 1 : 0 }}
        >
          <ChevronRight size={14} />
        </button>

        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className="flex min-w-0 items-center gap-1 overflow-x-auto cursor-grab"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          {tabs.map((t) => {
            const isActive = t.id === activeTabId;
            const isEditing = editingId === t.id;

            return (
              <div
                key={t.id}
                data-tab-id={t.id}
                onClick={() => onTabClick(t.id)}
                onDoubleClick={() => startEdit(t.id, t.title)}
                style={{ width: TAB_W, minWidth: TAB_W, flexShrink: 0, flexGrow: 0, position: 'relative', zIndex: 1 }}
                className={
                  'group flex h-8 items-center gap-1.5 rounded-soft px-3 text-sm select-none cursor-pointer transition-colors duration-150 ' +
                  (isActive
                    ? 'bg-surface text-text-primary'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary')
                }
              >
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-left text-[13px]">{t.title}</span>
                )}

                {t.isDirty && !isEditing && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                )}

                {!isEditing && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted transition-opacity hover:bg-subtle hover:text-text-primary group-hover:opacity-100 ' +
                      (isActive ? 'opacity-100' : 'opacity-0')
                    }
                  >
                    <X size={12} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <motion.button
        onClick={() => createTab()}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="relative z-20 ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-soft text-muted hover:bg-surface"
        aria-label="New tab"
        title="New tab"
      >
        <Plus size={15} />
      </motion.button>

    </div>
  );
}
