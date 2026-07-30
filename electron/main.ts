import { app, BrowserWindow, dialog, ipcMain, shell, nativeImage, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { registerFsHandlers } from './fs-handlers';
import { registerSnippetHandlers } from './snippets';
import { buildAppMenu, registerMenuHandlers } from './menu';

const isDev = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: unknown): void {
  if (data === undefined) {
    console.log(`[heartless] ${message}`);
    return;
  }
  console.log(`[heartless] ${message}`, data);
}

// Force consistent app identity so single-instance lock works in dev and prod.
app.setAppUserModelId('com.heartless.app');
// Force the app display name (overrides "Electron" shown in dev menus/dock).
app.setName('Heartless');
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({ applicationName: 'Heartless' });
}

let mainWindow: BrowserWindow | null = null;

// Schemes we are willing to hand to the OS. Anything else (file:, UNC paths,
// custom protocol handlers) could launch an executable from a link inside an
// untrusted markdown document, so it is rejected here — in main, because the
// renderer is the untrusted surface and cannot be relied on to filter.
const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function isSafeExternalUrl(url: string): boolean {
  try {
    return SAFE_EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false; // not parseable as an absolute URL
  }
}

function openExternalIfSafe(url: string): void {
  if (!isSafeExternalUrl(url)) {
    debugLog('Blocked external open for unsafe URL', url);
    return;
  }
  void shell.openExternal(url);
}

// Files the OS handed us before the renderer was ready to receive them.
// Drained by the renderer once it mounts (see the 'files:pending' handler).
const pendingOpenPaths: string[] = [];

/**
 * Extracts file paths from a process argv. Electron passes the executable as
 * argv[0] (plus `.` in dev), and Chromium adds switches, so anything starting
 * with `-` is skipped along with paths that no longer exist.
 */
function filePathsFromArgv(argv: string[]): string[] {
  return argv
    .slice(app.isPackaged ? 1 : 2)
    .filter((arg) => !arg.startsWith('-') && arg !== '.')
    .filter((arg) => {
      try {
        return fs.statSync(arg).isFile();
      } catch {
        return false;
      }
    })
    .map((arg) => path.resolve(arg));
}

/** Sends a path to the renderer, or queues it until the renderer is listening. */
function openPathInApp(filePath: string): void {
  const win = mainWindow;
  if (win && !win.webContents.isLoading()) {
    win.webContents.send('files:open-path', filePath);
    bringWindowToFront();
    return;
  }
  pendingOpenPaths.push(filePath);
}

function bringWindowToFront(): void {
  const win = mainWindow;
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function sessionFilePath(): string {
  return path.join(app.getPath('userData'), 'session.json');
}

function loadSession(): unknown {
  try {
    const raw = fs.readFileSync(sessionFilePath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(data: unknown): void {
  try {
    fs.mkdirSync(path.dirname(sessionFilePath()), { recursive: true });
    fs.writeFileSync(sessionFilePath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

function iconPath(): string {
  // During dev the resources folder sits at project root; in prod it's next to the app bundle.
  const iconFile = process.platform === 'win32' ? 'icon_win.png' : 'icon.png';
  const base = isDev
    ? path.join(__dirname, '..', 'resources', iconFile)
    : path.join(process.resourcesPath, iconFile);
  return base;
}

function createWindow(): void {
  debugLog('Creating main window', { isDev });
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 550,
    minHeight: 400,
    title: 'Heartless',
    backgroundColor: '#ffffff',
    icon: iconPath(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    ...(process.platform === 'win32'
      ? {
          frame: false,
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: {
            color: '#ffffff',
            symbolColor: '#0a0a0a',
            height: 40,
          },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  mainWindow.webContents.on('did-finish-load', () => {
    debugLog('Renderer finished loading');
  });

  // Keep window title as "Heartless" regardless of page title changes
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // Never let in-app navigation unload the renderer. Any http(s) link or
  // window.open call is redirected to the user's default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfSafe(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevServer = isDev && url.startsWith('http://localhost:5173');
    if (isDevServer) return;
    event.preventDefault();
    openExternalIfSafe(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const broadcastMaximizeState = (): void => {
    if (mainWindow) {
      mainWindow.webContents.send('window:maximize-changed', mainWindow.isMaximized());
    }
  };
  mainWindow.on('maximize', broadcastMaximizeState);
  mainWindow.on('unmaximize', broadcastMaximizeState);
}

bootApp();

function bootApp(): void {
  // Without the lock, double-clicking a second file would spawn another window
  // instead of opening a tab in the running app.
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', (_e, argv) => {
    for (const filePath of filePathsFromArgv(argv)) openPathInApp(filePath);
    bringWindowToFront();
  });

  // macOS delivers files this way (Finder double-click, "Open With", drop on
  // the dock icon) rather than through argv. It can fire before `whenReady`.
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    openPathInApp(filePath);
  });

  app.whenReady().then(() => {
    if (process.platform === 'darwin' && app.dock) {
      try {
        const img = nativeImage.createFromPath(iconPath());
        if (!img.isEmpty()) app.dock.setIcon(img);
      } catch { /* ignore */ }
    }

    ipcMain.handle('session:load', () => loadSession());
    ipcMain.handle('session:save', (_e, data: unknown) => { saveSession(data); return true; });
    ipcMain.handle('platform:get', () => process.platform);
    ipcMain.handle('shell:openExternal', (_e, url: string) => { openExternalIfSafe(url); });

    // The renderer calls this once it has mounted its listener, collecting any
    // file the OS handed us during startup (cold launch from a double-click).
    ipcMain.handle('files:pending', () => pendingOpenPaths.splice(0));

    // Confirmation before an action that discards unsaved tabs. Native dialog
    // rather than window.confirm, which Electron renders poorly and blocks on.
    ipcMain.handle('dialog:confirmDiscard', async (_e, dirtyCount: number) => {
      const win = mainWindow;
      if (!win) return false;
      const plural = dirtyCount === 1 ? 'tab has' : 'tabs have';
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Cancel', 'Discard and close'],
        defaultId: 0,
        cancelId: 0,
        title: 'Unsaved changes',
        message: `${dirtyCount} ${plural} unsaved changes.`,
        detail: 'Closing them will discard those changes. This cannot be undone.',
      });
      return response === 1;
    });
    ipcMain.handle('theme:getSystem', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));

    nativeTheme.on('updated', () => {
      const win = mainWindow;
      if (!win) return;
      win.webContents.send('theme:systemChanged', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    });

    ipcMain.handle('window:setOverlay', (_e, theme: 'light' | 'dark' | 'cream') => {
      if (process.platform !== 'win32') return false;
      const win = mainWindow;
      if (!win) return false;
      const palettes: Record<'light' | 'dark' | 'cream', { color: string; symbolColor: string }> = {
        light: { color: '#ffffff', symbolColor: '#0a0a0a' },
        dark:  { color: '#2A2B2A', symbolColor: '#f2f2f2' },
        cream: { color: '#F5EFE0', symbolColor: '#3D2F1F' },
      };
      const { color, symbolColor } = palettes[theme] ?? palettes.light;
      try {
        win.setTitleBarOverlay({ color, symbolColor, height: 40 });
        return true;
      } catch {
        return false;
      }
    });

    registerFsHandlers(ipcMain, () => mainWindow);
    registerSnippetHandlers(ipcMain);
    registerMenuHandlers(() => mainWindow);
    buildAppMenu(() => mainWindow);

    // A cold launch from a double-click puts the path in our own argv.
    for (const filePath of filePathsFromArgv(process.argv)) {
      pendingOpenPaths.push(filePath);
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch(() => { /* ignore */ });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
