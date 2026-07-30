import { app, Menu, BrowserWindow, ipcMain, webContents } from 'electron';

type GetWindow = () => BrowserWindow | null;

type CommandId =
  | 'file:new-tab'
  | 'file:open'
  | 'file:save'
  | 'file:save-as'
  | 'file:export'
  | 'file:close-tab'
  | 'file:close-all-tabs'
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:cut'
  | 'edit:copy'
  | 'edit:paste'
  | 'edit:select-all'
  | 'view:reload'
  | 'view:force-reload'
  | 'view:toggle-devtools'
  | 'view:reset-zoom'
  | 'view:zoom-in'
  | 'view:zoom-out'
  | 'view:toggle-fullscreen'
  | 'window:minimize'
  | 'window:maximize-toggle'
  | 'window:close';

const MENU_CHANNEL_FOR_FILE: Record<string, string> = {
  'file:new-tab':    'menu:new-tab',
  'file:open':       'menu:open',
  'file:save':       'menu:save',
  'file:save-as':    'menu:save-as',
  'file:export':     'menu:export',
  'file:close-tab':  'menu:close-tab',
  'file:close-all-tabs': 'menu:close-all-tabs',
};

function executeCommand(id: CommandId, getWindow: GetWindow): void {
  const win = getWindow();
  const sendToRenderer = (channel: string): void => {
    if (win) win.webContents.send(channel);
  };

  if (id in MENU_CHANNEL_FOR_FILE) {
    sendToRenderer(MENU_CHANNEL_FOR_FILE[id]);
    return;
  }

  const focused = webContents.getFocusedWebContents() ?? win?.webContents ?? null;

  switch (id) {
    case 'edit:undo':       focused?.undo(); return;
    case 'edit:redo':       focused?.redo(); return;
    case 'edit:cut':        focused?.cut(); return;
    case 'edit:copy':       focused?.copy(); return;
    case 'edit:paste':      focused?.paste(); return;
    case 'edit:select-all': focused?.selectAll(); return;

    case 'view:reload':           win?.webContents.reload(); return;
    case 'view:force-reload':     win?.webContents.reloadIgnoringCache(); return;
    case 'view:toggle-devtools':  win?.webContents.toggleDevTools(); return;
    case 'view:reset-zoom':       if (win) win.webContents.setZoomLevel(0); return;
    case 'view:zoom-in':          if (win) win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); return;
    case 'view:zoom-out':         if (win) win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); return;
    case 'view:toggle-fullscreen':
      if (win) win.setFullScreen(!win.isFullScreen());
      return;

    case 'window:minimize':        win?.minimize(); return;
    case 'window:maximize-toggle':
      if (!win) return;
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
      return;
    case 'window:close':           win?.close(); return;
  }
}

export function registerMenuHandlers(getWindow: GetWindow): void {
  ipcMain.handle('command:execute', (_e, id: CommandId) => {
    executeCommand(id, getWindow);
    return true;
  });

  ipcMain.handle('window:is-maximized', () => {
    const win = getWindow();
    return win ? win.isMaximized() : false;
  });
}

export function buildAppMenu(getWindow: GetWindow): void {
  const isMac = process.platform === 'darwin';

  // On Windows/Linux the menu is rendered in-app via React (see AppMenu.tsx).
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }

  const send = (channel: string) => {
    const win = getWindow();
    if (win) win.webContents.send(channel);
  };

  const fileMenu: Electron.MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      { label: 'New Tab',  accelerator: 'CmdOrCtrl+N',       click: () => send('menu:new-tab') },
      { type: 'separator' },
      { label: 'Open…',    accelerator: 'CmdOrCtrl+O',       click: () => send('menu:open') },
      { type: 'separator' },
      { label: 'Save',     accelerator: 'CmdOrCtrl+S',       click: () => send('menu:save') },
      { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
      { label: 'Export…',  accelerator: 'CmdOrCtrl+E',       click: () => send('menu:export') },
      { type: 'separator' },
      { label: 'Close Tab', accelerator: 'CmdOrCtrl+W',      click: () => send('menu:close-tab') },
    ],
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    fileMenu,
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Close All Tabs', accelerator: 'CmdOrCtrl+Shift+W', click: () => send('menu:close-all-tabs') },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
