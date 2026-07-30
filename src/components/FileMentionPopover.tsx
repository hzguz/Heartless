import { useEffect, useRef } from 'react';
import { Folder } from 'lucide-react';
import type { DirEntry } from '@/types';
import { getFileIconStyle } from '@/lib/fileIcons';

interface Props {
  entries: DirEntry[];
  query: string;
  selectedIndex: number;
  onSelect: (entry: DirEntry) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export function FileMentionPopover({ entries, query: _query, selectedIndex, onSelect, onClose, style }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (entries.length === 0) return null;

  return (
    <>
      {/* Backdrop to close on outside click */}
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="absolute z-50 flex flex-col overflow-hidden rounded-[10px] py-1 shadow-lg"
        style={{
          backgroundColor: 'var(--color-paper)',
          border: '1px solid var(--color-surface-2)',
          minWidth: 220,
          maxHeight: 260,
          overflowY: 'auto',
          ...style,
        }}
        ref={listRef}
        onMouseDown={(e) => e.preventDefault()}
      >
        {entries.map((entry, i) => (
          <button
            key={entry.path}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(entry); }}
            className="flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors"
            style={{
              backgroundColor: i === selectedIndex ? 'var(--color-surface)' : 'transparent',
              color: i === selectedIndex ? 'var(--color-text)' : 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = i === selectedIndex ? 'var(--color-surface)' : 'transparent'; }}
          >
            <span style={{ flexShrink: 0 }}>
              {entry.isDirectory
                ? <Folder size={13} style={{ color: 'var(--color-muted)' }} />
                : (() => { const { Icon, color } = getFileIconStyle(entry.name); return <Icon size={13} color={color} />; })()
              }
            </span>
            <span className="truncate font-medium">{entry.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}
