import { useEffect, useRef, useCallback, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditorContent, useEditor, BubbleMenu, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { filterEntries } from '@/lib/fileMention';
import { FileMentionPopover } from '@/components/FileMentionPopover';
import { useFilesStore } from '@/state/filesStore';
import { Bold, Italic, Strikethrough, Link as LinkIcon, Code2, Bookmark, Check, Heading1, Heading2, Heading3 } from 'lucide-react';
import type { Editor as TEditor } from '@tiptap/react';
import type { Tab } from '@/types';
import { useTabsStore } from '@/state/tabsStore';
import { useSnippetsStore } from '@/state/snippetsStore';
import { extractSelectionMd } from './SnippetsSidebar';
import { useThemeStore } from '@/state/themeStore';
import { FilePill } from '@/lib/filePillExtension';
import { MarkdownHardBreak } from '@/lib/hardBreakMarkdown';
import { SmartEnter } from '@/lib/smartEnter';
import { TightTaskList } from '@/lib/tightTaskList';
import { getMarkdown } from '@/lib/markdownStorage';
import { getFileIconStyle } from '@/lib/fileIcons';

const VirtualMarkdownPreview = lazy(() =>
  import('./VirtualMarkdownPreview').then((m) => ({ default: m.VirtualMarkdownPreview })),
);
const CodeWorkspace = lazy(() =>
  import('./CodeWorkspace').then((m) => ({ default: m.CodeWorkspace })),
);
const PreviewWorkspace = lazy(() =>
  import('./PreviewWorkspace').then((m) => ({ default: m.PreviewWorkspace })),
);

function FilePillView({ node }: NodeViewProps) {
  const { name, path } = node.attrs as { name: string; path: string };
  const { Icon } = getFileIconStyle(name);

  return (
    <NodeViewWrapper as="span" style={{ caretColor: 'transparent' }}>
      <span
        contentEditable={false}
        className="select-none font-medium"
        title={path}
        style={{
          userSelect: 'none',
          caretColor: 'transparent',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon
          size="1em"
          color="var(--color-accent)"
          strokeWidth={1.5}
          style={{ display: 'inline-block', verticalAlign: '-0.15em', marginRight: '4px', flexShrink: 0 }}
        />
        {name}
      </span>
    </NodeViewWrapper>
  );
}

interface Props {
  tab: Tab;
  onEditorReady: (editor: TEditor | null) => void;
}

const CONTENT_SYNC_DELAY = 150;

type FlushWindow = Window & { __heartlessFlushActiveEditor?: () => void };

export function Workspace(props: Props) {
  const minimalMode = useThemeStore((s) => s.minimalMode);
  const { onEditorReady } = props;
  const handleCodeReady = useCallback(() => onEditorReady(null), [onEditorReady]);

  if (props.tab.viewMode === 'preview') {
    return (
      <Suspense fallback={<div className="flex-1 bg-paper" />}>
        <PreviewWorkspace tab={props.tab} />
      </Suspense>
    );
  }
  if (props.tab.viewMode === 'code' && !minimalMode) {
    return (
      <Suspense fallback={<div className="flex-1 bg-paper" />}>
        <CodeWorkspace tab={props.tab} onEditorReady={handleCodeReady} />
      </Suspense>
    );
  }
  if (props.tab.largeFileMode) {
    return <LargeFileWorkspace {...props} />;
  }
  return <RichWorkspace {...props} />;
}

function LargeFileWorkspace({ tab, onEditorReady }: Props) {
  const updateContent = useTabsStore((s) => s.updateContent);
  const [draft, setDraft] = useState(tab.content);
  const [previewContent, setPreviewContent] = useState(tab.content);
  const [splitVertical, setSplitVertical] = useState(false);
  const [previewScrollRatio, setPreviewScrollRatio] = useState<number | null>(null);
  const latestDraft = useRef(tab.content);
  const syncTimer = useRef<number | null>(null);
  const previewTimer = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onEditorReady(null);
    return () => onEditorReady(null);
  }, [onEditorReady]);

  useEffect(() => {
    setDraft(tab.content);
    setPreviewContent(tab.content);
    latestDraft.current = tab.content;
  }, [tab.id, tab.content]);

  const flush = useCallback(() => {
    if (syncTimer.current !== null) {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    if (previewTimer.current !== null) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    setPreviewContent(latestDraft.current);
    const current = useTabsStore.getState().tabs.find((candidate) => candidate.id === tab.id);
    if (current?.content === latestDraft.current) return;
    updateContent(tab.id, latestDraft.current);
  }, [tab.id, updateContent]);

  useEffect(() => {
    const win = window as FlushWindow;
    win.__heartlessFlushActiveEditor = flush;
    return () => {
      if (win.__heartlessFlushActiveEditor === flush) {
        win.__heartlessFlushActiveEditor = undefined;
      }
      flush();
    };
  }, [flush]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSplitVertical(entry.contentRect.width < 560);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setDraft(next);
    latestDraft.current = next;
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null;
      const current = useTabsStore.getState().tabs.find((candidate) => candidate.id === tab.id);
      if (current?.content === latestDraft.current) return;
      updateContent(tab.id, latestDraft.current);
    }, CONTENT_SYNC_DELAY);
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => {
      previewTimer.current = null;
      setPreviewContent(latestDraft.current);
    }, 260);
  }, [tab.id, updateContent]);

  const handleTextareaScroll = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    setPreviewScrollRatio(el.scrollTop / max);
  }, []);

  const textarea = (
    <textarea
      ref={textareaRef}
      value={draft}
      onChange={handleChange}
      onBlur={flush}
      onScroll={handleTextareaScroll}
      spellCheck={false}
      className="min-h-0 flex-1 w-full resize-none overflow-y-auto bg-paper p-10 font-mono text-[14px] leading-relaxed text-text-primary outline-none app-scrollbar"
      placeholder="# Start writing markdown..."
    />
  );

  const preview = (
    <Suspense fallback={<div className="flex-1 bg-paper" />}>
      <VirtualMarkdownPreview
        content={previewContent}
        scrollRatio={previewScrollRatio}
        onScrollRatioChange={setPreviewScrollRatio}
      />
    </Suspense>
  );

  if (tab.viewMode === 'md') {
    return textarea;
  }

  if (tab.viewMode === 'split') {
    return (
      <div ref={wrapperRef} className={`flex flex-1 min-h-0 overflow-hidden ${splitVertical ? 'flex-col' : 'flex-row'}`}>
        <div
          className="flex min-h-0"
          style={{ flex: splitVertical ? '0 0 calc(50% - 0.5px)' : '0 0 calc(50% - 0.5px)' }}
        >
          {textarea}
        </div>
        <div
          className="shrink-0"
          style={splitVertical
            ? { height: 1, width: '100%', background: 'linear-gradient(to right, var(--color-subtle) 0%, transparent 100%)' }
            : { width: 1, height: '100%', background: 'linear-gradient(to bottom, var(--color-subtle) 0%, transparent 100%)' }
          }
        />
        <div className="flex min-h-0" style={{ flex: '0 0 calc(50% - 0.5px)' }}>
          {preview}
        </div>
      </div>
    );
  }

  return preview;
}

function RichWorkspace({ tab, onEditorReady }: Props) {
  const updateContent = useTabsStore((s) => s.updateContent);
  const getActive = useTabsStore((s) => s.getActive);
  const createSnippet = useSnippetsStore((s) => s.create);

  const lastEmittedRef = useRef<string>(tab.content);
  const isInternalUpdate = useRef(false);
  const savingSnippet = useRef(false);
  const [snippetSavedFlash, setSnippetSavedFlash] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const leftRef = useRef<HTMLTextAreaElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncing = useRef<'left' | 'right' | null>(null);
  const sourceRef = useRef<'textarea' | 'wysiwyg' | null>(null);
  const syncTimer = useRef<number | null>(null);
  const textareaSyncTimer = useRef<number | null>(null);
  const editorDirtyFromMdRef = useRef(false);

  const setRichScrollElement = useCallback((el: HTMLDivElement | null) => {
    rightRef.current = el;
  }, []);

  const [dropPulse, setDropPulse] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const rootPath = useFilesStore((s) => s.rootPath);
  const rootEntries = useFilesStore((s) => s.rootEntries);
  const [mentionState, setMentionState] = useState<{ query: string; top: number; left: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionEntries, setMentionEntries] = useState<import('@/types').DirEntry[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [splitVertical, setSplitVertical] = useState(false);

  useEffect(() => {
    if (!mentionState || !rootPath) return;
    setMentionEntries(filterEntries(rootEntries, mentionState.query));
    setMentionIndex(0);
  }, [mentionState?.query, rootEntries, rootPath]);

  // Intercept link clicks inside the editor so they open in the user's browser
  // instead of navigating the Electron renderer (which would unload the app).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onClick = (ev: MouseEvent): void => {
      const target = ev.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      ev.preventDefault();
      ev.stopPropagation();
      void window.heartless?.shell?.openExternal?.(href);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSplitVertical(entry.contentRect.width < 560);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const viewMode = tab.viewMode;
  const isSplit = viewMode === 'split';
  const isMd = viewMode === 'md';

  // Single Tiptap editor — always mounted, never destroyed on view mode change
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: { HTMLAttributes: { class: 'hl-codeblock' } },
        gapcursor: false,
        dropcursor: false,
        hardBreak: false,
      }),
      MarkdownHardBreak,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      TightTaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: true,
        transformPastedText: true,
        // Use Tiptap's plain-text clipboard serializer to preserve line breaks
        // without exposing Markdown hard-break escapes in other applications.
        transformCopiedText: false,
      }),
      SmartEnter,
      FilePill.extend({
        addNodeView() {
          return ReactNodeViewRenderer(FilePillView);
        },
      }),
      // Hides the native caret when cursor is adjacent to a filePill atom node
    ],
    content: tab.content,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'ProseMirror max-w-3xl w-full px-6 pt-10 pb-32',
      },
      handleDrop(_view, event) {
        const dt = (event as DragEvent).dataTransfer;
        if (!dt) return false;
        const types = Array.from(dt.types);

        // Let our native drop handler deal with all file/path drops — return true
        // to suppress ProseMirror's default behavior (which inserts raw text).
        if (
          types.includes('application/heartless-snippet') ||
          types.includes('application/heartless-file-path') ||
          types.includes('Files')
        ) {
          return true;
        }
        return false;
      },
      handlePaste(_view, event) {
        const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
        const isWinPath  = /^[A-Za-z]:[/\\].+/.test(text);
        const isUnixPath = /^\/[^ \n]+/.test(text);
        if (!(isWinPath || isUnixPath)) return false;
        const name = text.replace(/\\/g, '/').split('/').pop() ?? text;
        const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
        // insertFilePill is available after editor is created; use schema node directly
        const nodeType = _view.state.schema.nodes['filePill'];
        if (!nodeType) return false;
        const node = nodeType.create({ path: text, name, ext });
        const tr = _view.state.tr.replaceSelectionWith(node);
        _view.dispatch(tr);
        return true;
      },
    },
    onUpdate({ editor }) {
      if (sourceRef.current === 'textarea') return;
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        syncTimer.current = null;
        if (editor.isDestroyed) return;
        const md = getMarkdown(editor);
        lastEmittedRef.current = md;
        isInternalUpdate.current = true;
        sourceRef.current = 'wysiwyg';
        updateContent(tab.id, md);
        sourceRef.current = null;
      }, CONTENT_SYNC_DELAY);

      // Detect @mention trigger only when a workspace folder is open
      if (useFilesStore.getState().rootPath) {
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from);
        const match = textBefore.match(/@(\S*)$/);
        if (match) {
          try {
            const coords = editor.view.coordsAtPos(from);
            setMentionState({ query: match[1], top: coords.top, left: coords.left });
          } catch { /* ignore */ }
        } else {
          setMentionState((prev) => (prev === null ? null : null));
        }
      } else {
        setMentionState((prev) => (prev === null ? null : null));
      }
    },
  });

  const flushEditor = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    if (syncTimer.current !== null) {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    if (textareaSyncTimer.current !== null) {
      window.clearTimeout(textareaSyncTimer.current);
      textareaSyncTimer.current = null;
      sourceRef.current = 'textarea';
      editor.commands.setContent(lastEmittedRef.current, false);
      editorDirtyFromMdRef.current = false;
      sourceRef.current = null;
    }
    const md = sourceRef.current === 'textarea' || editorDirtyFromMdRef.current
      ? lastEmittedRef.current
      : getMarkdown(editor);
    const current = useTabsStore.getState().tabs.find((candidate) => candidate.id === tab.id);
    if (current?.content === md) return;
    lastEmittedRef.current = md;
    updateContent(tab.id, md);
  }, [editor, tab.id, updateContent]);

  useEffect(() => {
    const win = window as FlushWindow;
    win.__heartlessFlushActiveEditor = flushEditor;
    return () => {
      if (win.__heartlessFlushActiveEditor === flushEditor) {
        win.__heartlessFlushActiveEditor = undefined;
      }
      flushEditor();
    };
  }, [flushEditor]);

  useEffect(() => {
    onEditorReady(editor ?? null);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  // Sync external content changes into editor (file open, snippet insert, etc.)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      lastEmittedRef.current = tab.content;
      return;
    }
    if (tab.content !== lastEmittedRef.current) {
      lastEmittedRef.current = tab.content;
      editorDirtyFromMdRef.current = false;
      editor.commands.setContent(tab.content, false);
    }
  }, [editor, tab.content]);

  // Flush deferred raw-Markdown edits into the Tiptap editor when leaving pure MD mode
  useEffect(() => {
    if (!editor || editor.isDestroyed || isMd) return;
    if (editorDirtyFromMdRef.current) {
      editorDirtyFromMdRef.current = false;
      sourceRef.current = 'textarea';
      editor.commands.setContent(lastEmittedRef.current, false);
      sourceRef.current = null;
    }
  }, [editor, isMd]);

  // Textarea change → push to store, and defer/debounce ProseMirror re-parsing
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      lastEmittedRef.current = val;
      isInternalUpdate.current = true;
      updateContent(tab.id, val);
      if (isMd) {
        editorDirtyFromMdRef.current = true;
        return;
      }
      if (textareaSyncTimer.current !== null) {
        window.clearTimeout(textareaSyncTimer.current);
      }
      textareaSyncTimer.current = window.setTimeout(() => {
        textareaSyncTimer.current = null;
        if (editor && !editor.isDestroyed) {
          sourceRef.current = 'textarea';
          editor.commands.setContent(val, false);
          editorDirtyFromMdRef.current = false;
          sourceRef.current = null;
        }
      }, CONTENT_SYNC_DELAY);
    },
    [tab.id, updateContent, editor, isMd],
  );

  // Save snippet from selection
  const handleSaveSnippet = useCallback(async () => {
    if (!editor || savingSnippet.current) return;
    const active = getActive();
    if (!active) return;
    const body = extractSelectionMd(editor, active.content);
    const preview = body.slice(0, 30).replace(/\n/g, ' ');
    savingSnippet.current = true;
    try {
      await createSnippet(preview.trim() || 'Snippet', body);
      setSnippetSavedFlash(true);
      setTimeout(() => setSnippetSavedFlash(false), 1400);
    } finally {
      savingSnippet.current = false;
    }
  }, [editor, getActive, createSnippet]);

  const confirmMention = useCallback((entry: import('@/types').DirEntry) => {
    if (!editor || !mentionState) return;
    const { from } = editor.state.selection;
    const queryLen = mentionState.query.length + 1; // +1 for '@'
    const start = from - queryLen;
    const ext = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')) : '';
    editor.chain()
      .deleteRange({ from: start, to: from })
      .insertFilePill({ path: entry.path, name: entry.name, ext })
      .run();
    setMentionState(null);
  }, [editor, mentionState]);

  useEffect(() => {
    if (!mentionState) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionEntries.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const entry = mentionEntries[mentionIndex];
        if (entry) { e.preventDefault(); confirmMention(entry); }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState(null);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [mentionState, mentionEntries, mentionIndex, confirmMention]);

  // Scroll sync between textarea and wysiwyg panel
  const onScrollLeft = () => {
    if (syncing.current === 'right') return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    syncing.current = 'left';
    const ratio = left.scrollTop / Math.max(1, left.scrollHeight - left.clientHeight);
    right.scrollTop = ratio * (right.scrollHeight - right.clientHeight);
    requestAnimationFrame(() => { syncing.current = null; });
  };

  const onScrollRight = () => {
    if (syncing.current === 'left') return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    syncing.current = 'right';
    const ratio = right.scrollTop / Math.max(1, right.scrollHeight - right.clientHeight);
    left.scrollTop = ratio * (left.scrollHeight - left.clientHeight);
    requestAnimationFrame(() => { syncing.current = null; });
  };

  // Native drag handlers for snippet drop
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !editor) return;

    const isSnippet = (e: DragEvent): boolean =>
      !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('application/heartless-snippet');

    const isFileDrag = (e: DragEvent): boolean =>
      !!e.dataTransfer && (
        Array.from(e.dataTransfer.types).includes('Files') ||
        Array.from(e.dataTransfer.types).includes('application/heartless-file-path')
      );

    const isDraggable = (e: DragEvent) => isSnippet(e) || isFileDrag(e);

    const onDragEnter = (e: DragEvent) => {
      if (!isDraggable(e)) return;
      e.preventDefault();
    };

    const onDragOver = (e: DragEvent) => {
      if (!isDraggable(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isDraggable(e)) return;
    };

    const onDrop = (e: DragEvent) => {
      // FileExplorer drag: path stored in custom type
      const heartlessPath = e.dataTransfer?.getData('application/heartless-file-path');
      // OS file drop
      const droppedFiles = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];

      if (heartlessPath || droppedFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();


        let dropPos: number | null = null;
        try {
          const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
          if (pos && pos.pos >= 0 && pos.pos <= editor.view.state.doc.content.size) {
            dropPos = pos.pos;
          }
        } catch { /* ignore */ }

        // Collect all file paths from this drop
        const filePaths: string[] = heartlessPath
          ? [heartlessPath]
          : droppedFiles.map((f) => (f as File & { path?: string }).path ?? f.name);

        setTimeout(() => {
          try {
            editor.commands.focus();
            filePaths.forEach((p) => {
              const name = p.replace(/\\/g, '/').split('/').pop() ?? p;
              const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
              const chain = dropPos !== null
                ? editor.chain().setTextSelection(dropPos)
                : editor.chain();
              chain.insertFilePill({ path: p, name, ext }).run();
            });
            setDropPulse((n) => n + 1);
          } catch (err) {
            console.error('File drop failed', err);
          }
        }, 0);
        return;
      }

      if (!isSnippet(e)) return;
      e.preventDefault();
      e.stopPropagation();

      const body = e.dataTransfer?.getData('text/plain');
      if (!body) return;

      let dropPos: number | null = null;
      try {
        const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (pos && pos.pos >= 0 && pos.pos <= editor.view.state.doc.content.size) {
          dropPos = pos.pos;
        }
      } catch { /* ignore */ }

      setTimeout(() => {
        try {
          editor.commands.focus();
          if (dropPos !== null) {
            editor.chain().setTextSelection(dropPos).insertContent(body).run();
          } else {
            editor.commands.insertContent(body);
          }
          setDropPulse((n) => n + 1);
        } catch (err) {
          console.error('Snippet drop failed', err);
        }
      }, 0);
    };

    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);

    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [editor]);

  const bubbleMenu = editor && (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, delay: [320, 0], placement: 'top', maxWidth: 'none' }}
      shouldShow={({ editor, from, to }) => from !== to && editor.isEditable}
    >
      <div className="bubble-menu">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold"><Bold size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic"><Italic size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough"><Strikethrough size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Inline code"><Code2 size={14} /></button>
        <span className="divider" />
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1"><Heading1 size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2"><Heading2 size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="Heading 3"><Heading3 size={14} /></button>
        <span className="divider" />
        {linkInputOpen ? (
          <input
            ref={linkInputRef}
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const url = linkValue.trim();
                if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                else editor.chain().focus().unsetLink().run();
                setLinkInputOpen(false);
                setLinkValue('');
              }
              if (e.key === 'Escape') {
                setLinkInputOpen(false);
                setLinkValue('');
              }
              e.stopPropagation();
            }}
            onBlur={() => { setLinkInputOpen(false); setLinkValue(''); }}
            placeholder="https://"
            className="w-36 bg-transparent text-[12px] text-text-primary outline-none px-1"
          />
        ) : (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const prev = editor.getAttributes('link').href as string | undefined;
              if (editor.isActive('link') && !prev) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              setLinkValue(prev ?? '');
              setLinkInputOpen(true);
              setTimeout(() => linkInputRef.current?.focus(), 0);
            }}
            className={editor.isActive('link') ? 'is-active' : ''}
            title="Link"
          ><LinkIcon size={14} /></button>
        )}
        <span className="divider" />
        <button
          onClick={() => void handleSaveSnippet()}
          title="Save selection as snippet"
          style={{ whiteSpace: 'nowrap', color: snippetSavedFlash ? 'var(--color-accent)' : 'var(--color-text)', transition: 'color 0.15s' }}
        >
          <motion.span
            animate={{ scale: snippetSavedFlash ? [1, 1.25, 1] : 1, rotate: snippetSavedFlash ? [0, -8, 0] : 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0, 0, 1] }}
            className="flex"
          >
            {snippetSavedFlash ? <Check size={13} /> : <Bookmark size={13} />}
          </motion.span>
          <span>{snippetSavedFlash ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </BubbleMenu>
  );

  const splitDir = isSplit && splitVertical ? 'col' : 'row';

  return (
    <div ref={wrapperRef} className={`flex flex-1 min-h-0 overflow-hidden ${splitDir === 'col' ? 'flex-col' : 'flex-row'}`}>
      {/* MD / Split: raw textarea — visible when not wysiwyg */}
      {(isSplit || isMd) && (
        <textarea
          ref={leftRef}
          value={tab.content}
          onChange={handleTextareaChange}
          onScroll={onScrollLeft}
          spellCheck={false}
          style={{
            flex: isMd ? 1 : splitDir === 'col' ? '0 0 calc(50% - 0.5px)' : '0 0 calc(50% - 0.5px)',
          }}
          className="resize-none bg-paper p-10 font-mono text-[14px] leading-relaxed text-text-primary outline-none"
          placeholder="# Start writing markdown…"
        />
      )}

      {/* Split divider */}
      {isSplit && (
        <div
          className="shrink-0"
          style={splitDir === 'col'
            ? { height: 1, width: '100%', background: 'linear-gradient(to right, var(--color-subtle) 0%, transparent 100%)' }
            : { width: 1, height: '100%', background: 'linear-gradient(to bottom, var(--color-subtle) 0%, transparent 100%)' }
          }
        />
      )}

      {/* WYSIWYG panel — always in the DOM, hidden via CSS when in MD mode */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-col"
        style={{
          flex: isSplit ? '0 0 calc(50% - 0.5px)' : 1,
          display: isMd ? 'none' : 'flex',
        }}
      >
        {/* Drag overlays */}
        <AnimatePresence>
          {dropPulse > 0 && (
            <motion.div
              key={dropPulse}
              initial={{ opacity: 0.55, scale: 1 }} animate={{ opacity: 0, scale: 1.02 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 0, 0, 1] }}
              onAnimationComplete={() => setDropPulse(0)}
              className="pointer-events-none absolute inset-2 z-10 rounded-[12px]"
              style={{ boxShadow: 'inset 0 0 0 2px color-mix(in srgb, var(--color-accent) 50%, transparent)' }}
            />
          )}
        </AnimatePresence>
        {/* Editor scroll container */}
        <div
          ref={setRichScrollElement}
          onScroll={() => { isSplit && onScrollRight(); }}
          className="flex-1 min-h-0 overflow-y-auto app-scrollbar"
        >
          <EditorContent editor={editor} className="w-full" />
        </div>

        {bubbleMenu}

        {mentionState && mentionEntries.length > 0 && (
          <FileMentionPopover
            entries={mentionEntries}
            query={mentionState.query}
            selectedIndex={mentionIndex}
            onSelect={confirmMention}
            onClose={() => setMentionState(null)}
            style={{
              position: 'fixed',
              top: mentionState.top + 24,
              left: mentionState.left,
            }}
          />
        )}
      </div>
    </div>
  );
}
