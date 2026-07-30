import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Tabs } from './Tabs';
import { FormatToolbar } from './FormatToolbar';
import { AppMenu } from './AppMenu';

const BREAK_W = 740;
const WIN_OVERLAY_RESERVED = 140; // approximate width of titleBarOverlay window controls
const TOP_BAR_HEIGHT = 40;

interface Props {
  isMac: boolean;
  editor: Editor | null;
}

export function TitleBar({ isMac, editor }: Props) {
  const headerRef = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < BREAK_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The rail and panels live on the right, so this header is always the
  // leftmost column and always owns the traffic-light clearance.
  const leftPad = isMac ? 78 : 12;
  const rightPad = isMac ? 12 : WIN_OVERLAY_RESERVED;

  return (
    <header
      ref={headerRef}
      className="app-drag relative flex w-full shrink-0 flex-col bg-paper"
      style={{
        borderBottom: '1px solid var(--color-subtle)',
        transition: 'border-bottom-color 0.28s ease',
      }}
    >
      {/* Top bar: app menu + drag spacer */}
      <div
        className="flex w-full items-center"
        style={{ height: TOP_BAR_HEIGHT, paddingLeft: leftPad, paddingRight: rightPad }}
      >
        {!isMac && <AppMenu />}
        <div className="flex-1 self-stretch" />
      </div>

      {/* Second row: tabs + format toolbar */}
      {narrow ? (
        <>
          <div
            className="no-drag flex w-full min-w-0 items-center pr-3"
            style={{ paddingLeft: 12, paddingTop: 6 }}
          >
            <Tabs />
          </div>
          <div
            className="no-drag flex w-full items-center pr-3 pb-3"
            style={{ paddingLeft: 12, paddingTop: 6 }}
          >
            <div className="flex w-full items-center px-1.5 py-1">
              <FormatToolbar editor={editor} />
            </div>
          </div>
        </>
      ) : (
        <div
          className="flex w-full items-center gap-3 pr-3 pb-3"
          style={{ paddingLeft: 12, paddingTop: 6 }}
        >
          <div className="no-drag flex min-w-0 flex-1 items-center">
            <Tabs />
          </div>
          <div className="no-drag flex shrink-0 items-center gap-1">
            <div className="flex items-center px-1.5 py-1">
              <FormatToolbar editor={editor} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
