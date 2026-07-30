import { contextBridge, ipcRenderer } from 'electron';

export interface SnippetMeta {
  id: string;
  name: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenedFile {
  filePath: string;
  content: string;
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

const api = {
  platform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('platform:get'),

  session: {
    load: (): Promise<unknown> => ipcRenderer.invoke('session:load'),
    save: (data: unknown): Promise<boolean> => ipcRenderer.invoke('session:save', data),
  },

  files: {
    open: (): Promise<OpenedFile | null> => ipcRenderer.invoke('files:open'),
    save: (filePath: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke('files:save', filePath, content),
    saveAs: (content: string, suggestedName?: string): Promise<OpenedFile | null> =>
      ipcRenderer.invoke('files:saveAs', content, suggestedName),
    exportAs: (content: string, suggestedName?: string): Promise<OpenedFile | null> =>
      ipcRenderer.invoke('files:exportAs', content, suggestedName),
    readPath: (filePath: string): Promise<OpenedFile | null> =>
      ipcRenderer.invoke('files:readPath', filePath),
    readBase64: (filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('files:readBase64', filePath),
    docxToHtml: (filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('files:docxToHtml', filePath),
    /** Files the OS asked us to open before the renderer was listening. */
    pending: (): Promise<string[]> => ipcRenderer.invoke('files:pending'),
    /** Files the OS asks us to open while already running. */
    onOpenPath: (handler: (filePath: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, filePath: string): void => handler(filePath);
      ipcRenderer.on('files:open-path', listener);
      return () => ipcRenderer.removeListener('files:open-path', listener);
    },
  },

  dir: {
    openDialog: (): Promise<string | null> => ipcRenderer.invoke('dir:open'),
    read: (dirPath: string): Promise<DirEntry[]> => ipcRenderer.invoke('dir:read', dirPath),
    unwatch: (dirPath: string): Promise<boolean> => ipcRenderer.invoke('dir:unwatch', dirPath),
    create: (parentPath: string, name: string): Promise<string | null> =>
      ipcRenderer.invoke('dir:create', parentPath, name),
    onChanged: (handler: (dirPath: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, dirPath: string): void => handler(dirPath);
      ipcRenderer.on('dir:changed', listener);
      return () => ipcRenderer.removeListener('dir:changed', listener);
    },
  },

  fs: {
    createFile: (parentPath: string, name: string): Promise<string | null> =>
      ipcRenderer.invoke('files:create', parentPath, name),
    rename: (oldPath: string, newName: string): Promise<string | null> =>
      ipcRenderer.invoke('fs:rename', oldPath, newName),
    delete: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('fs:delete', targetPath),
    reveal: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('fs:reveal', targetPath),
    copyPath: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('fs:copyPath', targetPath),
  },

  snippets: {
    list: (): Promise<SnippetMeta[]> => ipcRenderer.invoke('snippets:list'),
    create: (name: string, body: string): Promise<SnippetMeta> =>
      ipcRenderer.invoke('snippets:create', name, body),
    read: (id: string): Promise<string> => ipcRenderer.invoke('snippets:read', id),
    rename: (id: string, name: string): Promise<boolean> => ipcRenderer.invoke('snippets:rename', id, name),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('snippets:delete', id),
  },

  shell: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  },

  dialog: {
    confirmDiscard: (dirtyCount: number): Promise<boolean> =>
      ipcRenderer.invoke('dialog:confirmDiscard', dirtyCount),
  },

  menu: {
    on: (channel: string, handler: () => void): (() => void) => {
      const allowed = [
        'menu:new-tab',
        'menu:open',
        'menu:save',
        'menu:save-as',
        'menu:export',
        'menu:close-tab',
        'menu:close-all-tabs',
      ];
      if (!allowed.includes(channel)) return () => {};
      const listener = (): void => handler();
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
  },

  commands: {
    execute: (id: string): Promise<boolean> => ipcRenderer.invoke('command:execute', id),
  },

  window: {
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (handler: (maximized: boolean) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, maximized: boolean): void => handler(maximized);
      ipcRenderer.on('window:maximize-changed', listener);
      return () => ipcRenderer.removeListener('window:maximize-changed', listener);
    },
    setOverlay: (theme: 'light' | 'dark' | 'cream'): Promise<boolean> =>
      ipcRenderer.invoke('window:setOverlay', theme),
  },

  theme: {
    getSystem: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:getSystem'),
    onSystemChange: (handler: (theme: 'light' | 'dark') => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, theme: 'light' | 'dark'): void => handler(theme);
      ipcRenderer.on('theme:systemChanged', listener);
      return () => ipcRenderer.removeListener('theme:systemChanged', listener);
    },
  },

};

export type HeartlessAPI = typeof api;

contextBridge.exposeInMainWorld('heartless', api);
