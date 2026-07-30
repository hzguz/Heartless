import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  FolderOpen,
  Folder,
  FolderGit2,
  FolderCog,
  FolderArchive,
  File as FileIcon,
  FileType,
  FilePlus,
  FolderPlus,
  RefreshCw,
  ChevronsDownUp,
  Image as ImageIcon,
  Palette,
  Terminal,
  Cog,
  Atom,
  Component,
  Webhook,
  LayoutGrid,
  Wrench,
  Box,
} from 'lucide-react';
import { getFileIconStyle } from '@/lib/fileIcons';
import type { IconStyle } from '@/lib/fileIcons';

const FOLDER_ICONS: Record<string, IconStyle> = {
  '.git':         { Icon: FolderGit2,    color: '#e4796b' },
  '.github':      { Icon: FolderGit2,    color: '#9aa0a6' },
  'node_modules': { Icon: FolderArchive, color: '#9aa0a6' },
  'dist':         { Icon: FolderArchive, color: '#9aa0a6' },
  'dist-electron':{ Icon: FolderArchive, color: '#9aa0a6' },
  'build':        { Icon: FolderArchive, color: '#9aa0a6' },
  '.yarn':        { Icon: FolderArchive, color: '#9aa0a6' },
  '.cache':       { Icon: FolderArchive, color: '#9aa0a6' },
  '.next':        { Icon: FolderArchive, color: '#9aa0a6' },
  'src':          { Icon: Folder,        color: '#6aa3e8' },
  'components':   { Icon: Component,     color: '#7ac4d6' },
  'hooks':        { Icon: Webhook,       color: '#d6a36a' },
  'lib':          { Icon: Box,           color: '#a597d6' },
  'utils':        { Icon: Wrench,        color: '#a597d6' },
  'helpers':      { Icon: Wrench,        color: '#a597d6' },
  'styles':       { Icon: Palette,       color: '#d67ab5' },
  'css':          { Icon: Palette,       color: '#d67ab5' },
  'state':        { Icon: LayoutGrid,    color: '#d6c46a' },
  'store':        { Icon: LayoutGrid,    color: '#d6c46a' },
  'stores':       { Icon: LayoutGrid,    color: '#d6c46a' },
  'types':        { Icon: FileType,      color: '#6aa3e8' },
  'scripts':      { Icon: Terminal,      color: '#9aa0a6' },
  'electron':     { Icon: Cog,           color: '#6fc1e0' },
  'public':       { Icon: Folder,        color: '#9aa0a6' },
  'assets':       { Icon: ImageIcon,     color: '#7ac4d6' },
  'resources':    { Icon: ImageIcon,     color: '#7ac4d6' },
  'tests':        { Icon: Atom,          color: '#d6a36a' },
  '__tests__':    { Icon: Atom,          color: '#d6a36a' },
  'config':       { Icon: FolderCog,     color: '#9aa0a6' },
  '.vscode':      { Icon: FolderCog,     color: '#6aa3e8' },
};

function getFolderIcon(name: string): IconStyle | null {
  return FOLDER_ICONS[name.toLowerCase()] ?? null;
}

import { useFilesStore } from '@/state/filesStore';
import { useTabsStore, filenameFromPath } from '@/state/tabsStore';
import { useUIStore } from '@/state/uiStore';
import { useT } from '@/lib/i18n';
import { isLargeOpenedFile } from '@/lib/largeFiles';
import { isCodeFile, detectLanguage, getPreviewType, extOf } from '@/lib/languageDetect';
import type { DirEntry } from '@/types';
import { SidebarPanel, type SidebarSide } from './SidebarPanel';

const TEXT_EXTS = new Set([
  '.md', '.markdown', '.txt', '.json', '.js', '.jsx', '.ts', '.tsx',
  '.css', '.scss', '.html', '.xml', '.yaml', '.yml', '.toml',
  '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.sh',
]);

function isOpenableFile(filePath: string): boolean {
  const ext = extOf(filePath);
  if (!ext) return false;
  return TEXT_EXTS.has(ext) || getPreviewType(filePath) !== null;
}

interface ContextMenuState {
  x: number;
  y: number;
  entry: DirEntry;
}

interface PendingCreate {
  parentPath: string;
  kind: 'file' | 'folder';
}

type FlatTreeRow =
  | { kind: 'entry'; entry: DirEntry; depth: number }
  | { kind: 'create'; parentPath: string; createKind: 'file' | 'folder'; depth: number };

interface TreeRowProps {
  entry: DirEntry;
  depth: number;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, entry: DirEntry) => void;
  activeFilePath: string | null;
  renamingPath: string | null;
  onCommitRename: (oldPath: string, newName: string) => Promise<void>;
  onCancelRename: () => void;
}

function VirtualTreeRow(props: TreeRowProps) {
  const {
    entry, depth, onOpenFile, onContextMenu, activeFilePath,
    renamingPath, onCommitRename, onCancelRename,
  } = props;

  const expanded = useFilesStore((s) => s.expanded[entry.path]);
  const toggleDir = useFilesStore((s) => s.toggleDir);
  const isOpen = expanded !== undefined;
  const isActive = !entry.isDirectory && activeFilePath === entry.path;
  const isRenaming = renamingPath === entry.path;
  const indent = depth * 12 + 6;

  const handleClick = (): void => {
    if (isRenaming) return;
    if (entry.isDirectory) void toggleDir(entry.path);
    else onOpenFile(entry.path);
  };

  const handleDragStart = (e: React.DragEvent): void => {
    e.dataTransfer.setData('application/heartless-file-path', entry.path);
    e.dataTransfer.setData('text/plain', entry.path);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu(e, entry)}
      title={entry.path}
      className={
        'group flex w-full items-center gap-2 py-[3px] pr-2 text-[12.5px] cursor-pointer select-none rounded-[4px] transition-colors ' +
        (isActive
          ? 'bg-surface text-text-primary'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary')
      }
      style={{ paddingLeft: indent }}
    >
      {entry.isDirectory ? (
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="flex h-3 w-3 shrink-0 items-center justify-center text-text-secondary"
        >
          <ChevronRight size={12} />
        </motion.span>
      ) : (
        <span className="h-3 w-3 shrink-0" />
      )}

      {(() => {
        if (entry.isDirectory) {
          const known = getFolderIcon(entry.name);
          if (known) {
            const Custom = known.Icon;
            return <Custom size={13} className="shrink-0" style={{ color: known.color }} />;
          }
          return isOpen
            ? <FolderOpen size={13} className="shrink-0 text-text-secondary" />
            : <Folder size={13} className="shrink-0 text-text-secondary" />;
        }
        const { Icon, color } = getFileIconStyle(entry.name);
        return <Icon size={13} className="shrink-0" style={{ color }} />;
      })()}

      {isRenaming ? (
        <RenameInput
          initial={entry.name}
          onCommit={(name) => onCommitRename(entry.path, name)}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
      )}
    </div>
  );
}

function RenameInput({
  initial, onCommit, onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const dot = initial.lastIndexOf('.');
    if (dot > 0) ref.current?.setSelectionRange(0, dot);
    else ref.current?.select();
  }, [initial]);

  const commit = (): void => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) onCancel();
    else onCommit(trimmed);
  };

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      className="min-w-0 flex-1 bg-paper border border-accent/40 rounded-[3px] px-1 py-px text-[12.5px] text-text-primary outline-none"
    />
  );
}

function CreateRow({
  depth, kind, onCommit, onCancel,
}: {
  depth: number;
  kind: 'file' | 'folder';
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  // Enter commits and then the input unmounts, which fires onBlur — so without
  // this latch commit() runs twice and the second call hits EEXIST.
  const done = useRef(false);

  const commit = (): void => {
    if (done.current) return;
    done.current = true;
    const trimmed = value.trim();
    if (!trimmed) onCancel();
    else onCommit(trimmed);
  };

  const cancel = (): void => {
    if (done.current) return;
    done.current = true;
    onCancel();
  };

  return (
    <div
      className="flex items-center gap-2 py-[3px] pr-2"
      style={{ paddingLeft: depth * 12 + 6 }}
    >
      <span className="h-3 w-3 shrink-0" />
      {kind === 'folder' ? (
        <Folder size={13} className="shrink-0 text-text-secondary" />
      ) : (
        <FileIcon size={13} className="shrink-0 text-text-secondary" />
      )}
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') cancel();
          e.stopPropagation();
        }}
        placeholder={kind === 'folder' ? 'new-folder' : 'new-file.md'}
        className="min-w-0 flex-1 bg-paper border border-accent/40 rounded-[3px] px-1 py-px text-[12.5px] text-text-primary placeholder:text-muted outline-none"
      />
    </div>
  );
}

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onOpen: () => void;
  onOpenAsRoot: () => void;
  onRename: () => void;
  onDelete: () => void;
  onReveal: () => void;
  onCopyPath: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
}

type CtxItem = { label: string; onClick: () => void; danger?: boolean } | { separator: true };

function ContextMenu(props: ContextMenuProps) {
  const {
    state,
    onClose,
    onOpen,
    onOpenAsRoot,
    onRename,
    onDelete,
    onReveal,
    onCopyPath,
    onNewFile,
    onNewFolder,
  } = props;
  const t = useT();

  useEffect(() => {
    const onDocClick = (): void => onClose();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const isDir = state.entry.isDirectory;

  const items: CtxItem[] = isDir
    ? [
        { label: t('context.openAsRoot'), onClick: onOpenAsRoot },
        { separator: true },
        { label: t('files.newFile'),    onClick: onNewFile },
        { label: t('files.newFolder'),  onClick: onNewFolder },
        { separator: true },
        { label: t('context.rename'),   onClick: onRename },
        { label: t('context.delete'),   onClick: onDelete, danger: true },
        { separator: true },
        { label: t('context.reveal'),   onClick: onReveal },
        { label: t('context.copyPath'), onClick: onCopyPath },
      ]
    : [
        { label: t('context.open'),     onClick: onOpen },
        { separator: true },
        { label: t('context.rename'),   onClick: onRename },
        { label: t('context.delete'),   onClick: onDelete, danger: true },
        { separator: true },
        { label: t('context.reveal'),   onClick: onReveal },
        { label: t('context.copyPath'), onClick: onCopyPath },
      ];

  return (
    <motion.div
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.12, ease: [0.25, 0, 0, 1] }}
      className="allow-shadow fixed z-[60] min-w-[180px] rounded-soft border border-subtle bg-paper px-1 py-1"
      style={{ left: state.x, top: state.y, boxShadow: 'var(--shadow-popover)' }}
    >
      {items.map((item, idx) =>
        'separator' in item ? (
          <div key={`sep-${idx}`} className="my-1 h-px bg-subtle" />
        ) : (
          <button
            key={item.label}
            type="button"
            onClick={() => { item.onClick(); onClose(); }}
            className={
              'flex w-full items-center rounded-[5px] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-surface ' +
              (item.danger ? 'text-accent' : 'text-text-primary')
            }
          >
            {item.label}
          </button>
        ),
      )}
    </motion.div>
  );
}

export function FileExplorerSidebar({ side }: { side: SidebarSide }) {
  const t = useT();
  const open = useUIStore((s) => s.activePanel === 'files');
  const rootPath = useFilesStore((s) => s.rootPath);
  const rootEntries = useFilesStore((s) => s.rootEntries);
  const expanded = useFilesStore((s) => s.expanded);
  const setRoot = useFilesStore((s) => s.setRoot);
  const clearRoot = useFilesStore((s) => s.clearRoot);
  const refresh = useFilesStore((s) => s.refresh);
  const expandDir = useFilesStore((s) => s.expandDir);
  const collapseAll = (): void => {
    const expanded = useFilesStore.getState().expanded;
    Object.keys(expanded).forEach((p) => {
      void window.heartless.dir.unwatch(p);
    });
    useFilesStore.setState({ expanded: {} });
  };

  const createTab = useTabsStore((s) => s.createTab);
  const tabs = useTabsStore((s) => s.tabs);
  const setActive = useTabsStore((s) => s.setActive);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const activeFilePath = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId)?.filePath ?? null,
    [tabs, activeTabId],
  );

  const listParentRef = useRef<HTMLDivElement | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [createError, setCreateError] = useState<{ parentPath: string; name: string } | null>(null);

  const flatRows = useMemo<FlatTreeRow[]>(() => {
    if (!rootPath) return [];
    const rows: FlatTreeRow[] = [];
    if (pendingCreate?.parentPath === rootPath) {
      rows.push({
        kind: 'create',
        parentPath: rootPath,
        createKind: pendingCreate.kind,
        depth: 0,
      });
    }

    const pushEntries = (entries: DirEntry[], depth: number): void => {
      for (const entry of entries) {
        rows.push({ kind: 'entry', entry, depth });
        if (!entry.isDirectory) continue;
        const children = expanded[entry.path];
        if (!children) continue;
        if (pendingCreate?.parentPath === entry.path) {
          rows.push({
            kind: 'create',
            parentPath: entry.path,
            createKind: pendingCreate.kind,
            depth: depth + 1,
          });
        }
        pushEntries(children, depth + 1);
      }
    };

    pushEntries(rootEntries, 0);
    return rows;
  }, [rootPath, rootEntries, pendingCreate, expanded]);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 24,
    overscan: 12,
  });

  // Watcher: refresh whenever any tracked dir changes. Skipped while a create
  // row is open — refresh() replaces `expanded` with new object identities,
  // which rebuilds the virtual rows and can tear the input out mid-typing.
  // handleCommitCreate refreshes explicitly once it is done.
  const pendingCreateRef = useRef<PendingCreate | null>(null);
  pendingCreateRef.current = pendingCreate;

  useEffect(() => {
    const off = window.heartless.dir.onChanged(() => {
      if (pendingCreateRef.current || renamingPath) return;
      void refresh();
    });
    return off;
  }, [refresh, renamingPath]);

  const onChooseFolder = async (): Promise<void> => {
    const dir = await window.heartless.dir.openDialog();
    if (dir) await setRoot(dir);
  };

  const onOpenFile = async (filePath: string): Promise<void> => {
    if (!isOpenableFile(filePath)) return;
    const existing = tabs.find((tab) => tab.filePath === filePath);
    if (existing) {
      setActive(existing.id);
      return;
    }
    const previewType = getPreviewType(filePath);
    if (previewType) {
      createTab({
        title: filenameFromPath(filePath),
        filePath,
        content: '',
        isDirty: false,
        viewMode: 'preview',
        previewType,
      });
      return;
    }
    const file = await window.heartless.files.readPath(filePath);
    if (!file) return;
    const largeFileMode = isLargeOpenedFile(file);
    const isCode = isCodeFile(file.filePath);
    const { label } = detectLanguage(file.filePath);
    createTab({
      title: filenameFromPath(file.filePath),
      filePath: file.filePath,
      content: file.content,
      isDirty: false,
      viewMode: isCode ? 'code' : 'wysiwyg',
      largeFileMode,
      language: isCode ? label : undefined,
    });
  };

  const handleContextMenu = (e: React.MouseEvent, entry: DirEntry): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  };

  const handleCommitRename = async (oldPath: string, newName: string): Promise<void> => {
    setRenamingPath(null);
    await window.heartless.fs.rename(oldPath, newName);
    await refresh();
  };

  const handleCommitCreate = async (name: string): Promise<void> => {
    if (!pendingCreate) return;
    const { parentPath, kind } = pendingCreate;
    setPendingCreate(null);
    const created = kind === 'folder'
      ? await window.heartless.dir.create(parentPath, name)
      : await window.heartless.fs.createFile(parentPath, name);

    // Both handlers return null on failure (already exists, permission denied,
    // invalid name). Without this the click just did nothing, with no clue why.
    if (!created) {
      setCreateError({ parentPath, name });
      return;
    }
    setCreateError(null);
    // Make sure parent is expanded so the new node is visible after refresh.
    if (parentPath !== rootPath) await expandDir(parentPath);
    await refresh();
  };

  const startCreateInDir = (parentPath: string, kind: 'file' | 'folder'): void => {
    setCreateError(null);
    // Expand first so the create row has somewhere to appear; expandDir is a
    // no-op when the directory is already open.
    void expandDir(parentPath).then(() => setPendingCreate({ parentPath, kind }));
  };

  const startCreateInRoot = (kind: 'file' | 'folder'): void => {
    if (!rootPath) return;
    setPendingCreate({ parentPath: rootPath, kind });
  };

  const handleDelete = async (entry: DirEntry): Promise<void> => {
    await window.heartless.fs.delete(entry.path);
    await refresh();
  };

  const rootName = rootPath ? rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath : null;

  // Only the row-level props: the create row is rendered directly by the
  // virtualised list, not passed down through tree nodes.
  const treeProps = {
    onOpenFile,
    onContextMenu: handleContextMenu,
    activeFilePath,
    renamingPath,
    onCommitRename: handleCommitRename,
    onCancelRename: () => setRenamingPath(null),
  };

  return (
    <SidebarPanel panelKey="files-sidebar" open={open} side={side}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-subtle">
              <span className="text-[12px] font-medium text-text-secondary">
                {t('panel.files')}
              </span>
              {rootPath && (
                <div className="flex items-center gap-0.5 text-text-secondary">
                  <IconButton title={t('files.newFile')}   onClick={() => startCreateInRoot('file')}>
                    <FilePlus size={12} />
                  </IconButton>
                  <IconButton title={t('files.newFolder')} onClick={() => startCreateInRoot('folder')}>
                    <FolderPlus size={12} />
                  </IconButton>
                  <IconButton title={t('files.refresh')}    onClick={() => void refresh()}>
                    <RefreshCw size={12} />
                  </IconButton>
                  <IconButton title={t('files.collapseAll')} onClick={collapseAll}>
                    <ChevronsDownUp size={12} />
                  </IconButton>
                </div>
              )}
            </div>

            {rootPath ? (
              <>
                {/* Root folder name — sits outside the scroll container so it stays fixed */}
                <div className="shrink-0 flex items-center justify-between gap-2 border-b border-subtle px-5 pt-3 pb-2">
                  <p className="truncate text-[12.5px] font-medium text-text-primary" title={rootPath}>
                    {rootName}
                  </p>
                  <button
                    type="button"
                    onClick={() => void clearRoot()}
                    className="shrink-0 text-[11px] text-muted hover:text-text-primary transition-colors"
                    title={t('files.close')}
                  >
                    {t('files.close')}
                  </button>
                </div>

                {createError && (
                  <p
                    className="mx-3 mb-1 shrink-0 text-[11px] text-accent"
                    role="alert"
                  >
                    {t('files.createFailed').replace('{name}', createError.name)}
                  </p>
                )}

                <div
                  ref={(el) => {
                    listParentRef.current = el;
                  }}
                  className="flex-1 overflow-y-auto app-scrollbar"
                  onContextMenu={(e) => {
                    if (e.target === e.currentTarget && rootPath) {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        entry: { name: rootName ?? '', path: rootPath, isDirectory: true },
                      });
                    }
                  }}
                >
                  <div
                    className="relative px-3 pt-2 pb-3"
                    style={{ height: flatRows.length > 0 ? rowVirtualizer.getTotalSize() : undefined }}
                  >
                    {flatRows.length === 0 ? (
                      <p className="py-2 text-[11.5px] text-muted">{t('files.empty')}</p>
                    ) : (
                      rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = flatRows[virtualRow.index];
                        if (!row) return null;
                        return (
                          <div
                            key={row.kind === 'entry' ? row.entry.path : `${row.parentPath}:create`}
                            className="absolute left-3 right-3 top-0"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                          >
                            {row.kind === 'create' ? (
                              <CreateRow
                                depth={row.depth}
                                kind={row.createKind}
                                onCommit={(name) => void handleCommitCreate(name)}
                                onCancel={() => setPendingCreate(null)}
                              />
                            ) : (
                              <VirtualTreeRow
                                entry={row.entry}
                                depth={row.depth}
                                onOpenFile={treeProps.onOpenFile}
                                onContextMenu={treeProps.onContextMenu}
                                activeFilePath={treeProps.activeFilePath}
                                renamingPath={treeProps.renamingPath}
                                onCommitRename={treeProps.onCommitRename}
                                onCancelRename={treeProps.onCancelRename}
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <FolderOpen size={20} className="text-muted" />
                <p className="text-[12.5px] text-text-primary">{t('files.noFolder')}</p>
                <button
                  type="button"
                  onClick={() => void onChooseFolder()}
                  className="rounded-[8px] border border-subtle px-3 py-1.5 text-[11.5px] font-medium text-text-primary transition-colors hover:bg-surface"
                >
                  {t('files.openFolder')}
                </button>
              </div>
            )}

          {/* Fixed-position overlay, so nesting it here doesn't move it. */}
          <AnimatePresence>
            {contextMenu && (
              <ContextMenu
                state={contextMenu}
                onClose={() => setContextMenu(null)}
                onOpen={() => void onOpenFile(contextMenu.entry.path)}
                onOpenAsRoot={() => { setRoot(contextMenu.entry.path); setContextMenu(null); }}
                onRename={() => setRenamingPath(contextMenu.entry.path)}
                onDelete={() => void handleDelete(contextMenu.entry)}
                onReveal={() => void window.heartless.fs.reveal(contextMenu.entry.path)}
                onCopyPath={() => void window.heartless.fs.copyPath(contextMenu.entry.path)}
                onNewFile={() => startCreateInDir(contextMenu.entry.path, 'file')}
                onNewFolder={() => startCreateInDir(contextMenu.entry.path, 'folder')}
              />
            )}
          </AnimatePresence>
    </SidebarPanel>
  );
}

function IconButton({
  title, onClick, children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-[5px] hover:bg-surface hover:text-text-primary transition-colors"
    >
      {children}
    </button>
  );
}
