import { useTabsStore, emptyTab, filenameFromPath } from '@/state/tabsStore';
import type { Tab } from '@/types';
import { isLargeOpenedFile } from './largeFiles';
import { isCodeFile, detectLanguage, getPreviewType } from './languageDetect';

function flushActiveEditor(): void {
  (window as Window & { __heartlessFlushActiveEditor?: () => void }).__heartlessFlushActiveEditor?.();
}

/**
 * Preview tabs (image / PDF / Word) carry `content: ''` because the binary is
 * rendered natively, never loaded into the editor. Writing that empty string
 * back would truncate the user's file to 0 bytes, so every save path bails out.
 */
function isReadOnlyTab(tab: Tab): boolean {
  // Keyed on the current mode, not on `previewType`: an SVG toggled to source
  // keeps previewType set but now holds real editable content, so it must save.
  // While in `preview` the content is empty and writing it would truncate.
  return tab.viewMode === 'preview';
}

/**
 * Opens a file by absolute path, reusing an existing tab when the file is
 * already open. Shared by the file explorer and by files handed to the app by
 * the OS (double-click, "Open with", drag onto the dock icon).
 */
export async function openFileByPath(filePath: string): Promise<void> {
  const { tabs, setActive, createTab } = useTabsStore.getState();

  const existing = tabs.find((t) => t.filePath === filePath);
  if (existing) {
    setActive(existing.id);
    return;
  }

  const previewType = getPreviewType(filePath);
  if (previewType) {
    createTab({
      filePath,
      content: '',
      title: filenameFromPath(filePath),
      isDirty: false,
      viewMode: 'preview',
      previewType,
    });
    return;
  }

  const file = await window.heartless.files.readPath(filePath);
  if (!file) return;
  const isCode = isCodeFile(file.filePath);
  const { label } = detectLanguage(file.filePath);
  createTab({
    filePath: file.filePath,
    content: file.content,
    title: filenameFromPath(file.filePath),
    isDirty: false,
    viewMode: isCode ? 'code' : 'wysiwyg',
    largeFileMode: isLargeOpenedFile(file),
    language: isCode ? label : undefined,
  });
}

export async function fileOpen(): Promise<void> {
  const res = await window.heartless.files.open();
  if (!res) return;
  const { createTab } = useTabsStore.getState();
  const previewType = getPreviewType(res.filePath);
  if (previewType) {
    createTab({
      filePath: res.filePath,
      content: '',
      title: filenameFromPath(res.filePath),
      isDirty: false,
      viewMode: 'preview',
      previewType,
    });
    return;
  }
  const largeFileMode = isLargeOpenedFile(res);
  const isCode = isCodeFile(res.filePath);
  const { label } = detectLanguage(res.filePath);
  createTab({
    filePath: res.filePath,
    content: res.content,
    title: filenameFromPath(res.filePath),
    isDirty: false,
    viewMode: isCode ? 'code' : 'wysiwyg',
    largeFileMode,
    language: isCode ? label : undefined,
  });
}

export async function fileSave(): Promise<void> {
  flushActiveEditor();
  const { getActive, markSaved } = useTabsStore.getState();
  const active: Tab | null = getActive();
  if (!active || isReadOnlyTab(active)) return;
  if (active.filePath) {
    // Only clear the dirty flag if the write actually succeeded — otherwise the
    // tab would look saved while the file on disk is stale.
    const ok = await window.heartless.files.save(active.filePath, active.content);
    if (ok) markSaved(active.id, active.filePath);
  } else {
    const res = await window.heartless.files.saveAs(active.content, active.title);
    if (res) markSaved(active.id, res.filePath);
  }
}

export async function fileSaveAs(): Promise<void> {
  flushActiveEditor();
  const { getActive, markSaved } = useTabsStore.getState();
  const active = getActive();
  if (!active || isReadOnlyTab(active)) return;
  const res = await window.heartless.files.saveAs(active.content, active.title);
  if (res) markSaved(active.id, res.filePath);
}

export async function fileExport(): Promise<void> {
  flushActiveEditor();
  const { getActive, updateContent } = useTabsStore.getState();
  const active = getActive();
  if (!active || isReadOnlyTab(active)) return;
  const res = await window.heartless.files.exportAs(active.content, active.title);
  if (res) updateContent(active.id, res.content);
}

export function fileNewTab(): void {
  const { createTab } = useTabsStore.getState();
  createTab(emptyTab());
}

export function fileCloseActiveTab(): void {
  flushActiveEditor();
  const { activeTabId, closeTab } = useTabsStore.getState();
  if (activeTabId) closeTab(activeTabId);
}

export async function fileCloseAllTabs(): Promise<void> {
  // Flush first so in-flight edits are reflected in the dirty count below.
  flushActiveEditor();
  const { tabs, closeAllTabs } = useTabsStore.getState();
  // Unlike closing one tab, this discards every unsaved buffer at once and the
  // next session save persists the loss — so it has to be confirmed.
  const dirtyCount = tabs.filter((t) => t.isDirty).length;
  if (dirtyCount > 0) {
    const confirmed = await window.heartless.dialog.confirmDiscard(dirtyCount);
    if (!confirmed) return;
  }
  closeAllTabs();
}
