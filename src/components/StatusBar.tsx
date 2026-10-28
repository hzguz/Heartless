import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Columns2, Code2, LayoutPanelLeft, Settings, FileCode2, Eye } from 'lucide-react';
import type { Tab, ViewMode } from '@/types';
import { useTabsStore } from '@/state/tabsStore';
import { useThemeStore } from '@/state/themeStore';
import { useUIStore } from '@/state/uiStore';
import { useT } from '@/lib/i18n';
import { isEditablePreview } from '@/lib/languageDetect';

interface Props {
  active: Tab | null;
}

const MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  wysiwyg:  <LayoutPanelLeft size={11} />,
  split:    <Columns2 size={11} />,
  md:       <Code2 size={11} />,
  code:     <FileCode2 size={11} />,
  preview:  <Eye size={11} />,
};

const MODE_LABELS: Record<ViewMode, string> = {
  wysiwyg: 'Default',
  split:   'Split',
  md:      'Editor',
  code:    'Code',
  preview: 'Preview',
};

export function countWords(s: string): number {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i);
    // ASCII whitespace: space (32), tab (9), LF (10), VT (11), FF (12), CR (13), or NBSP (160)
    const isSpace = code === 32 || (code >= 9 && code <= 13) || code === 160;
    if (!isSpace) {
      if (!inWord) {
        count += 1;
        inWord = true;
      }
    } else {
      inWord = false;
    }
  }
  return count;
}

export function StatusBar({ active }: Props) {
  const t = useT();
  const setViewMode = useTabsStore((s) => s.setViewMode);
  const togglePreviewSource = useTabsStore((s) => s.togglePreviewSource);
  const minimalMode = useThemeStore((s) => s.minimalMode);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const settingsOpen = useUIStore((s) => s.activePanel === 'settings');
  // Word counting walks the whole document; keep it off unrelated re-renders.
  const words = useMemo(() => countWords(active?.content ?? ''), [active?.content]);

  if (!active) return null;
  const isCode = active.viewMode === 'code';
  const isPreview = active.viewMode === 'preview';
  // Preview tabs hold a binary file with no editor representation — cycling
  // would strand it in Tiptap with no route back.
  const isLocked = isCode || isPreview;
  const viewMode: ViewMode = active.viewMode;
  // SVG is markup, so it can flip between the rendered image and its source.
  const canToggleSource = active.filePath !== null
    && active.previewType !== undefined
    && isEditablePreview(active.filePath);

  const handleSplitClick = (): void => {
    if (isLocked) return;
    const next: ViewMode =
      viewMode === 'wysiwyg' ? 'split' : viewMode === 'split' ? 'md' : 'wysiwyg';
    setViewMode(active.id, next);
  };

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between bg-paper px-3 text-[11px] text-muted">
      <span className="shrink-0">
        {isPreview
          ? MODE_LABELS.preview
          : isCode
            ? (active.language ?? 'Code')
            : `${words} ${t('status.words')}`}
        {active.isDirty && !isPreview && ` • ${t('status.unsaved')}`}
      </span>

      <div className="flex items-center gap-3">
        {canToggleSource && (
          <button
            onClick={() => { void togglePreviewSource(active.id); }}
            title={isPreview ? t('status.editSource') : t('status.showPreview')}
            className="flex items-center gap-[5px] text-[11px] text-muted transition-colors hover:text-text-primary"
          >
            {isPreview ? <Code2 size={11} /> : <Eye size={11} />}
            {isPreview ? t('status.editSource') : t('status.showPreview')}
          </button>
        )}
        <button
          onClick={handleSplitClick}
          title={isLocked ? (isCode ? active.language ?? 'Code' : MODE_LABELS.preview) : 'Cycle view mode: Default → Split → Editor'}
          className="flex items-center gap-[6px] text-[11px] text-muted transition-colors hover:text-text-primary"
          style={{ cursor: isLocked ? 'default' : 'pointer' }}
        >
          <span
            className="inline-flex items-center justify-center"
            style={{ position: 'relative', top: -0.1 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={viewMode}
                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                transition={{ duration: 0.18, ease: [0.25, 0, 0, 1] }}
                className="flex"
              >
                {MODE_ICONS[viewMode]}
              </motion.span>
            </AnimatePresence>
          </span>
          {MODE_LABELS[viewMode]}
        </button>

        {minimalMode && (
          <button
            onClick={() => togglePanel('settings')}
            title="Settings"
            className="flex items-center transition-colors hover:text-text-primary"
            style={{ color: settingsOpen ? 'var(--color-accent)' : undefined }}
          >
            <Settings size={12} />
          </button>
        )}
      </div>
    </footer>
  );
}
