import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { parseMarkdownBlocks, renderMarkdownBlock } from '@/lib/markdownBlocks';

interface Props {
  content: string;
  className?: string;
  scrollRatio?: number | null;
  onScrollRatioChange?: (ratio: number) => void;
}

const BASE_OVERSCAN = 18;
const FAST_OVERSCAN = 36;
const FAST_SCROLL_DELTA = 900;

export function VirtualMarkdownPreview({ content, className = '', scrollRatio, onScrollRatioChange }: Props) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const lastScroll = useRef({ top: 0, time: performance.now() });
  const [overscan, setOverscan] = useState(BASE_OVERSCAN);
  const settleTimer = useRef<number | null>(null);

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => blocks[index]?.estimatedHeight ?? 72,
    overscan,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [blocks, virtualizer]);

  useEffect(() => {
    if (scrollRatio == null) return;
    const el = parentRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    el.scrollTop = scrollRatio * max;
  }, [scrollRatio, blocks]);

  useEffect(() => {
    return () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    };
  }, []);

  const setScrollElement = useCallback((el: HTMLDivElement | null) => {
    parentRef.current = el;
  }, []);

  const handleScroll = () => {
    const el = parentRef.current;
    if (!el) return;

    const now = performance.now();
    const delta = Math.abs(el.scrollTop - lastScroll.current.top);
    const elapsed = Math.max(1, now - lastScroll.current.time);
    const velocity = (delta / elapsed) * 1000;
    lastScroll.current = { top: el.scrollTop, time: now };

    if (velocity > FAST_SCROLL_DELTA && overscan !== FAST_OVERSCAN) {
      setOverscan(FAST_OVERSCAN);
    }
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setOverscan(BASE_OVERSCAN), 160);

    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    onScrollRatioChange?.(el.scrollTop / max);
  };

  if (blocks.length === 0) {
    return (
      <div
        ref={setScrollElement}
        className={`flex-1 min-h-0 overflow-y-auto app-scrollbar bg-paper ${className}`}
        onScroll={handleScroll}
      >
        <div className="ProseMirror max-w-3xl w-full px-6 pt-10 pb-32 text-muted">Start writing...</div>
      </div>
    );
  }

  return (
    <div
      ref={setScrollElement}
      className={`flex-1 min-h-0 overflow-y-auto app-scrollbar bg-paper ${className}`}
      onScroll={handleScroll}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const block = blocks[virtualRow.index];
          if (!block) return null;
          return (
            <div
              key={virtualRow.key}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full px-6"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div
                className="ProseMirror heartless-markdown-preview max-w-3xl w-full"
                dangerouslySetInnerHTML={{ __html: renderMarkdownBlock(block) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
