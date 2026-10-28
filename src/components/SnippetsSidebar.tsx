import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, Check } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useSnippetsStore } from '@/state/snippetsStore';
import { useTabsStore } from '@/state/tabsStore';
import { useUIStore } from '@/state/uiStore';
import { useT } from '@/lib/i18n';
import { getMarkdown, serializeNode } from '@/lib/markdownStorage';
import type { SnippetMeta } from '@/types';
import { SidebarPanel, type SidebarSide } from './SidebarPanel';

interface Props {
  editor: Editor | null;
  side: SidebarSide;
}

export function extractSelectionMd(editor: Editor, fallback: string): string {
  const { from, to } = editor.state.selection;
  if (from === to) {
    return getMarkdown(editor, fallback);
  }
  // Serialize selection as proper Markdown using tiptap-markdown serializer
  try {
    const slice = editor.state.doc.slice(from, to);
    // Create a temporary doc node wrapping the selection fragment
    const { schema } = editor.state;
    const tmpDoc = schema.nodes.doc.create(undefined, slice.content);
    const md = serializeNode(editor, tmpDoc);
    if (md !== null) return md.trim() || fallback;
  } catch {
    // fallback below
  }
  return editor.state.doc.textBetween(from, to, '\n\n').trim() || fallback;
}

interface SnippetCardProps {
  snippet: SnippetMeta;
  body: string | undefined;
  onInsert: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  expanded: boolean;
}

function SnippetCard({
  snippet,
  body,
  onInsert,
  onDelete,
  onToggle,
  onRename,
  expanded,
}: SnippetCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(snippet.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    try {
      e.dataTransfer.setData('text/plain', body ?? snippet.name);
      e.dataTransfer.setData('application/heartless-snippet', snippet.id);
      e.dataTransfer.effectAllowed = 'copy';

      // Build a clean, rounded drag preview to replace the default screenshot.
      const ghost = document.createElement('div');
      ghost.textContent = snippet.name;
      ghost.style.cssText = [
        'position:fixed',
        'top:-1000px',
        'left:-1000px',
        'padding:8px 14px',
        'background:var(--color-paper)',
        'border-radius:10px',
        'font:500 12.5px -apple-system,BlinkMacSystemFont,Inter,sans-serif',
        'color:var(--color-text)',
        'border:1px solid var(--color-subtle)',
        'white-space:nowrap',
        'max-width:240px',
        'overflow:hidden',
        'text-overflow:ellipsis',
        'box-shadow:var(--shadow-popover)',
        'pointer-events:none',
      ].join(';');
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 14, 14);
      setTimeout(() => ghost.remove(), 0);
    } catch {
      // ignore
    }
    setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  const startNameEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameValue(snippet.name);
    setEditingName(true);
    setTimeout(() => { nameInputRef.current?.select(); }, 0);
  };

  const commitNameEdit = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== snippet.name) onRename(snippet.id, trimmed);
    setEditingName(false);
  };

  return (
    <motion.div
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      transition={{ duration: 0.16, ease: [0.25, 0, 0, 1] }}
      className="group overflow-hidden"
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="flex items-stretch rounded-[8px] transition-colors hover:bg-surface"
      >
        {/* Main button (insert) */}
        <div
          onClick={() => !editingName && onInsert(snippet.id)}
          className="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left cursor-pointer"
          title="Click to insert · Double-click title to rename · Drag to editor"
        >
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              autoFocus
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitNameEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNameEdit();
                if (e.key === 'Escape') setEditingName(false);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-[12.5px] text-text-primary outline-none border-b border-subtle"
            />
          ) : (
            <span
              className="w-full truncate text-[12.5px] text-text-primary"
              onDoubleClick={startNameEdit}
              title="Double-click to rename"
            >
              {snippet.name}
            </span>
          )}
          {body !== undefined && !expanded && !editingName && (
            <span className="w-full truncate text-[11px] text-muted mt-0.5">
              {body.replace(/\n+/g, ' ').slice(0, 60) || '—'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(snippet.id); }}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-muted hover:text-text-primary"
            title={expanded ? 'Collapse' : 'Preview'}
          >
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={12} />
            </motion.span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(snippet.id); }}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-muted hover:text-accent"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <pre className="mx-2 my-1.5 px-2 py-1.5 font-mono text-[11px] leading-snug text-text-secondary whitespace-pre-wrap overflow-y-auto max-h-[110px] border-l border-subtle">
              {body ?? '…'}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SnippetsSidebar({ editor, side }: Props) {
  const t = useT();
  const list = useSnippetsStore((s) => s.list);
  const create = useSnippetsStore((s) => s.create);
  const remove = useSnippetsStore((s) => s.remove);
  const rename = useSnippetsStore((s) => s.rename);
  const read = useSnippetsStore((s) => s.read);
  const open = useUIStore((s) => s.activePanel === 'snippets');
  const getActive = useTabsStore((s) => s.getActive);

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor || !open) { setHasSelection(false); return; }
    const update = (): void => {
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    };
    update();
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('selectionUpdate', update);
    };
  }, [editor, open]);

  useEffect(() => {
    if (!open) return;
    const missing = list.filter((s) => bodies[s.id] === undefined);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (s) => ({ id: s.id, body: await read(s.id) })),
    ).then((loaded) => {
      if (cancelled) return;
      setBodies((prev) => {
        const next = { ...prev };
        for (const item of loaded) next[item.id] = item.body;
        return next;
      });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, open]);

  const loadBody = async (id: string) => {
    if (bodies[id] !== undefined) return bodies[id];
    const body = await read(id);
    setBodies((p) => ({ ...p, [id]: body }));
    return body;
  };

  const onSave = async () => {
    if (busy) return;
    const active = getActive();
    if (!active) return;
    const body = editor ? extractSelectionMd(editor, active.content) : active.content;
    setBusy(true);
    try {
      const meta = await create(name.trim() || 'Untitled snippet', body);
      setBodies((p) => ({ ...p, [meta.id]: body }));
      setName('');
      setSavedFlash(meta.name);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(null), 2400);
    } finally {
      setBusy(false);
    }
  };

  const onInsert = async (id: string) => {
    if (!editor) return;
    const body = await loadBody(id);
    editor.chain().focus().insertContent(body).run();
  };

  const onToggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    await loadBody(id);
  };

  return (
    <SidebarPanel panelKey="snippets-sidebar" open={open} side={side}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-subtle">
              <span className="text-[12px] font-medium text-text-secondary">
                {t('panel.snippets')}
              </span>
              {list.length > 0 && (
                <span className="text-[11px] text-muted tabular-nums">{list.length}</span>
              )}
            </div>

            {/* Save bar — bordered container; turns accent when a selection exists */}
            <div className="px-5 pt-3">
              <div
                className={
                  'flex items-center gap-2 rounded-[6px] border px-2 transition-colors focus-within:border-muted ' +
                  (hasSelection ? 'border-muted' : 'border-subtle')
                }
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('snippets.placeholder')}
                  onKeyDown={(e) => { if (e.key === 'Enter') void onSave(); }}
                  className="flex-1 min-w-0 bg-transparent py-2 text-[12.5px] text-text-primary placeholder:text-muted outline-none"
                />
                <button
                  onClick={() => void onSave()}
                  disabled={busy}
                  className="shrink-0 py-2 text-[11.5px] font-medium text-accent hover:opacity-80 disabled:opacity-30 transition-opacity"
                  title={t('snippets.save')}
                >
                  {t('snippets.save')}
                </button>
              </div>
            </div>

            {/* List */}
            <div
              className="flex-1 px-3 pb-3 pt-2 overflow-y-auto app-scrollbar"
            >
              {list.length > 0 ? (
                <motion.div layout className="flex flex-col py-1">
                  {list.map((s) => (
                    <SnippetCard
                      key={s.id}
                      snippet={s}
                      body={bodies[s.id]}
                      onInsert={onInsert}
                      onDelete={remove}
                      onRename={rename}
                      onToggle={onToggle}
                      expanded={expanded === s.id}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: [0.25, 0, 0, 1], delay: 0.08 }}
                  className="flex h-full flex-col items-center justify-center px-6 text-center"
                >
                  <p className="text-[12.5px] font-medium text-text-primary">{t('snippets.empty.title')}</p>
                  <p className="mt-1 max-w-[200px] text-[11.5px] leading-snug text-muted">
                    {t('snippets.empty.body')}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Saved flash — fixed at the bottom of the panel */}
            <AnimatePresence>
              {savedFlash && (
                <motion.div
                  key="flash"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: [0.25, 0, 0, 1] }}
                  className="shrink-0 border-t border-subtle px-5 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Check size={11} className="text-accent shrink-0" />
                    <p className="min-w-0 flex-1 truncate text-[11.5px] text-text-secondary">
                      {t('snippets.saved')} <span className="text-text-primary">"{savedFlash}"</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
    </SidebarPanel>
  );
}
