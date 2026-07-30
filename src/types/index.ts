export type ViewMode = 'wysiwyg' | 'split' | 'md' | 'code' | 'preview';
export type PreviewType = 'image' | 'pdf' | 'word';

export interface CustomThemeData {
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface Tab {
  id: string;
  title: string;
  filePath: string | null;
  content: string;
  isDirty: boolean;
  viewMode: ViewMode;
  revision: number;
  largeFileMode?: boolean;
  language?: string;
  previewType?: PreviewType;
}

export interface PersistedTab {
  id: string;
  title: string;
  filePath: string | null;
  content: string;
  viewMode: ViewMode;
  revision?: number;
  largeFileMode?: boolean;
  language?: string;
  previewType?: PreviewType;
}

export type Language = 'en' | 'pt' | 'ja';
export type ThemePreference = 'system' | 'light' | 'dark' | 'cream';
export interface PersistedSession {
  tabs: PersistedTab[];
  activeTabId: string | null;
  snippetsOpen: boolean;
  activePanel?: 'files' | 'snippets' | 'settings' | null;
  theme?: 'light' | 'dark' | 'cream';
  themePref?: ThemePreference;
  minimalMode?: boolean;
  customTheme?: CustomThemeData | null;
  language?: Language;
  filesRootPath?: string | null;
  filesExpanded?: string[];
}

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
  sizeBytes: number;
  lineCount: number;
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

declare global {
  interface Window {
    heartless: {
      platform: () => Promise<NodeJS.Platform>;
      session: {
        load: () => Promise<PersistedSession | null>;
        save: (data: PersistedSession) => Promise<boolean>;
      };
      files: {
        open: () => Promise<OpenedFile | null>;
        save: (filePath: string, content: string) => Promise<boolean>;
        saveAs: (content: string, suggestedName?: string) => Promise<OpenedFile | null>;
        exportAs: (content: string, suggestedName?: string) => Promise<OpenedFile | null>;
        readPath: (filePath: string) => Promise<OpenedFile | null>;
        readBase64: (filePath: string) => Promise<string | null>;
        docxToHtml: (filePath: string) => Promise<string | null>;
        pending: () => Promise<string[]>;
        onOpenPath: (handler: (filePath: string) => void) => () => void;
      };
      dir: {
        openDialog: () => Promise<string | null>;
        read: (dirPath: string) => Promise<DirEntry[]>;
        unwatch: (dirPath: string) => Promise<boolean>;
        create: (parentPath: string, name: string) => Promise<string | null>;
        onChanged: (handler: (dirPath: string) => void) => () => void;
      };
      fs: {
        createFile: (parentPath: string, name: string) => Promise<string | null>;
        rename: (oldPath: string, newName: string) => Promise<string | null>;
        delete: (targetPath: string) => Promise<boolean>;
        reveal: (targetPath: string) => Promise<boolean>;
        copyPath: (targetPath: string) => Promise<boolean>;
      };
      snippets: {
        list: () => Promise<SnippetMeta[]>;
        create: (name: string, body: string) => Promise<SnippetMeta>;
        read: (id: string) => Promise<string>;
        rename: (id: string, name: string) => Promise<boolean>;
        delete: (id: string) => Promise<boolean>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      dialog: {
        confirmDiscard: (dirtyCount: number) => Promise<boolean>;
      };
      menu: {
        on: (channel: MenuChannel, handler: () => void) => () => void;
      };
      commands: {
        execute: (id: CommandId) => Promise<boolean>;
      };
      window: {
        isMaximized: () => Promise<boolean>;
        onMaximizeChange: (handler: (maximized: boolean) => void) => () => void;
        setOverlay: (theme: 'light' | 'dark' | 'cream') => Promise<boolean>;
      };
      theme: {
        getSystem: () => Promise<'light' | 'dark'>;
        onSystemChange: (handler: (theme: 'light' | 'dark') => void) => () => void;
      };
    };
  }
}

export type CommandId =
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

export type MenuChannel =
  | 'menu:new-tab'
  | 'menu:open'
  | 'menu:save'
  | 'menu:save-as'
  | 'menu:export'
  | 'menu:close-tab'
  | 'menu:close-all-tabs';
