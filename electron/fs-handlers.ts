import { dialog, IpcMain, BrowserWindow, shell, clipboard } from 'electron';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

type GetWindow = () => BrowserWindow | null;

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

// Binary/rich formats that open in a preview pane instead of the text editor.
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
const PDF_EXTS = new Set(['.pdf']);
// .docx only — mammoth reads OOXML, not the legacy .doc binary format, so
// advertising .doc would route it to a preview that always fails.
const WORD_EXTS = new Set(['.docx']);

// Folders we hide by default (heavy / noise).
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.cache', 'dist', 'dist-electron',
  '.yarn', '.parcel-cache', '.turbo',
]);
const DIR_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });

const watchers = new Map<string, fsSync.FSWatcher>();
let watchEmitTimer: NodeJS.Timeout | null = null;

/**
 * Coalesces watcher events across *all* directories into one emit, so a build
 * tool touching a hundred files produces a single refresh.
 *
 * Note the payload is only the last directory that changed — earlier ones are
 * dropped by design. The renderer ignores it and re-reads every expanded
 * directory anyway; treat `dir:changed` as "something changed", not as a
 * precise description of what.
 */
function emitDirChanged(getWindow: GetWindow, dirPath: string): void {
  if (watchEmitTimer) clearTimeout(watchEmitTimer);
  watchEmitTimer = setTimeout(() => {
    const win = getWindow();
    if (win) win.webContents.send('dir:changed', dirPath);
  }, 120);
}

function stopWatcher(dirPath: string): void {
  const w = watchers.get(dirPath);
  if (w) {
    try { w.close(); } catch { /* ignore */ }
    watchers.delete(dirPath);
  }
}

function startWatcher(getWindow: GetWindow, dirPath: string): void {
  if (watchers.has(dirPath)) return;
  try {
    const watcher = fsSync.watch(dirPath, { persistent: false }, () => {
      emitDirChanged(getWindow, dirPath);
    });
    watcher.on('error', () => stopWatcher(dirPath));
    watchers.set(dirPath, watcher);
  } catch {
    // ignore — dir may have been removed
  }
}

/**
 * Joins a user-supplied entry name onto a parent directory, refusing anything
 * that escapes it. The name comes from a text field in the renderer, so
 * "../../../Windows/System32/x" would otherwise write outside the folder the
 * user actually picked. Returns null when the name is unusable.
 */
function safeJoin(parentPath: string, name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') return null;
  // A rooted name would make path.join ignore the parent entirely.
  if (path.isAbsolute(trimmed)) return null;

  const parent = path.resolve(parentPath);
  const target = path.resolve(parent, trimmed);
  if (target !== parent && !target.startsWith(parent + path.sep)) return null;
  return target;
}

function isPreviewFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTS.has(ext) || PDF_EXTS.has(ext) || WORD_EXTS.has(ext);
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  let count = 1;
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) count += 1;
  }
  return count;
}

async function readOpenedFile(filePath: string) {
  const [stat, content] = await Promise.all([
    fs.stat(filePath),
    fs.readFile(filePath, 'utf-8'),
  ]);
  return {
    filePath,
    content,
    sizeBytes: stat.size,
    lineCount: countLines(content),
  };
}

export function registerFsHandlers(ipcMain: IpcMain, getWindow: GetWindow): void {
  ipcMain.handle('dir:open', async () => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Open Folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dir:read', async (_e, dirPath: string): Promise<DirEntry[]> => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const mapped: DirEntry[] = entries
        .filter((entry) => {
          if (entry.isDirectory()) return !IGNORED_DIRS.has(entry.name);
          return true;
        })
        .map((entry) => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
          isDirectory: entry.isDirectory(),
        }));
      mapped.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return DIR_COLLATOR.compare(a.name, b.name);
      });
      startWatcher(getWindow, dirPath);
      return mapped;
    } catch {
      return [];
    }
  });

  ipcMain.handle('dir:unwatch', (_e, dirPath: string) => {
    stopWatcher(dirPath);
    return true;
  });

  ipcMain.handle('dir:create', async (_e, parentPath: string, name: string) => {
    const target = safeJoin(parentPath, name);
    if (!target) return null;
    try {
      await fs.mkdir(target, { recursive: false });
      return target;
    } catch {
      return null;
    }
  });

  ipcMain.handle('files:create', async (_e, parentPath: string, name: string) => {
    const target = safeJoin(parentPath, name);
    if (!target) return null;
    try {
      await fs.writeFile(target, '', { flag: 'wx' });
      return target;
    } catch {
      return null;
    }
  });

  ipcMain.handle('fs:rename', async (_e, oldPath: string, newName: string) => {
    const newPath = safeJoin(path.dirname(oldPath), newName);
    if (!newPath) return null;
    try {
      await fs.rename(oldPath, newPath);
      return newPath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('fs:delete', async (_e, targetPath: string) => {
    try {
      await shell.trashItem(targetPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:reveal', (_e, targetPath: string) => {
    shell.showItemInFolder(targetPath);
    return true;
  });

  ipcMain.handle('fs:copyPath', (_e, targetPath: string) => {
    clipboard.writeText(targetPath);
    return true;
  });

  ipcMain.handle('files:readPath', async (_e, filePath: string) => {
    try {
      return await readOpenedFile(filePath);
    } catch {
      return null;
    }
  });

  ipcMain.handle('files:open', async () => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Open File',
      filters: [
        { name: 'All Supported', extensions: ['md', 'markdown', 'txt', 'html', 'htm', 'css', 'scss', 'js', 'jsx', 'mjs', 'ts', 'tsx', 'json', 'php', 'xml', 'svg', 'yaml', 'yml', 'toml', 'py', 'rs', 'go', 'java', 'sh', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'pdf', 'docx'] },
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'Web', extensions: ['html', 'htm', 'css', 'scss', 'js', 'jsx', 'ts', 'tsx', 'json', 'php'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Word', extensions: ['docx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    if (isPreviewFile(filePath)) {
      const stat = await fs.stat(filePath);
      return { filePath, content: '', sizeBytes: stat.size, lineCount: 0 };
    }
    return await readOpenedFile(filePath);
  });

  ipcMain.handle('files:readBase64', async (_e, filePath: string) => {
    try {
      const buf = await fs.readFile(filePath);
      return buf.toString('base64');
    } catch {
      return null;
    }
  });

  ipcMain.handle('files:docxToHtml', async (_e, filePath: string) => {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ path: filePath });
      return result.value;
    } catch {
      return null;
    }
  });

  // Returns false instead of throwing: a read-only file or full disk would
  // otherwise surface as an unhandled rejection with no feedback at all.
  ipcMain.handle('files:save', async (_e, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('files:saveAs', async (_e, content: string, suggestedName?: string) => {
    const win = getWindow();
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Save File',
      defaultPath: suggestedName ?? 'Untitled.md',
      filters: [
        { name: 'All Supported', extensions: ['md', 'markdown', 'txt', 'html', 'htm', 'css', 'scss', 'js', 'jsx', 'ts', 'tsx', 'json', 'php', 'xml', 'yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    const filePath = path.extname(result.filePath) ? result.filePath : `${result.filePath}.md`;
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      filePath,
      content,
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
      lineCount: countLines(content),
    };
  });

  ipcMain.handle('files:exportAs', async (_e, content: string, suggestedName?: string) => {
    const win = getWindow();
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Export Markdown',
      defaultPath: suggestedName ?? 'Untitled.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (result.canceled || !result.filePath) return null;
    const filePath = ensureMdExtension(result.filePath);
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      filePath,
      content,
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
      lineCount: countLines(content),
    };
  });
}

function ensureMdExtension(p: string): string {
  return path.extname(p) ? p : `${p}.md`;
}
