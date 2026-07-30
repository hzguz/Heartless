import { create } from 'zustand';
import type { DirEntry } from '@/types';

interface FilesState {
  rootPath: string | null;
  rootEntries: DirEntry[];
  // Map: dirPath -> children entries. Presence in this map == expanded.
  expanded: Record<string, DirEntry[]>;
  loading: boolean;
  setRoot: (rootPath: string | null) => Promise<void>;
  clearRoot: () => Promise<void>;
  toggleDir: (dirPath: string) => Promise<void>;
  expandDir: (dirPath: string) => Promise<void>;
  collapseDir: (dirPath: string) => void;
  refresh: () => Promise<void>;
  hydrate: (rootPath: string | null, expanded: string[]) => Promise<void>;
  serializeExpanded: () => string[];
}

export const useFilesStore = create<FilesState>((set, get) => ({
  rootPath: null,
  rootEntries: [],
  expanded: {},
  loading: false,

  setRoot: async (rootPath) => {
    const previous = get().rootPath;
    if (previous && previous !== rootPath) {
      void window.heartless.dir.unwatch(previous);
    }
    if (!rootPath) {
      set({ rootPath: null, rootEntries: [], expanded: {}, loading: false });
      return;
    }
    set({ loading: true });
    const entries = await window.heartless.dir.read(rootPath);
    set({ rootPath, rootEntries: entries, expanded: {}, loading: false });
  },

  clearRoot: async () => {
    const previous = get().rootPath;
    if (previous) void window.heartless.dir.unwatch(previous);
    set({ rootPath: null, rootEntries: [], expanded: {} });
  },

  expandDir: async (dirPath) => {
    if (get().expanded[dirPath] !== undefined) return;
    const children = await window.heartless.dir.read(dirPath);
    set({ expanded: { ...get().expanded, [dirPath]: children } });
  },

  collapseDir: (dirPath) => {
    const next = { ...get().expanded };
    // Collapse this and any descendants — they're no longer relevant.
    for (const key of Object.keys(next)) {
      if (key === dirPath || key.startsWith(dirPath + '/') || key.startsWith(dirPath + '\\')) {
        delete next[key];
        void window.heartless.dir.unwatch(key);
      }
    }
    set({ expanded: next });
  },

  toggleDir: async (dirPath) => {
    if (get().expanded[dirPath] !== undefined) {
      get().collapseDir(dirPath);
    } else {
      await get().expandDir(dirPath);
    }
  },

  refresh: async () => {
    const { rootPath, expanded } = get();
    if (!rootPath) return;
    const rootEntries = await window.heartless.dir.read(rootPath);
    const newExpanded: Record<string, DirEntry[]> = {};
    const reachable = new Set<string>();

    const collect = (entries: DirEntry[]): void => {
      for (const entry of entries) {
        if (entry.isDirectory) reachable.add(entry.path);
      }
    };
    collect(rootEntries);

    // Re-read every still-expanded directory whose parent is reachable.
    const ordered = Object.keys(expanded).sort((a, b) => a.length - b.length);
    for (const dirPath of ordered) {
      if (!reachable.has(dirPath)) continue;
      // eslint-disable-next-line no-await-in-loop
      const children = await window.heartless.dir.read(dirPath);
      newExpanded[dirPath] = children;
      collect(children);
    }

    set({ rootEntries, expanded: newExpanded });
  },

  hydrate: async (rootPath, expanded) => {
    if (!rootPath) {
      set({ rootPath: null, rootEntries: [], expanded: {} });
      return;
    }
    const rootEntries = await window.heartless.dir.read(rootPath);
    set({ rootPath, rootEntries, expanded: {}, loading: false });

    // Re-expand persisted dirs, deepest-last so parents exist first.
    const ordered = [...expanded].sort((a, b) => a.length - b.length);
    for (const dirPath of ordered) {
      // eslint-disable-next-line no-await-in-loop
      await get().expandDir(dirPath);
    }
  },

  serializeExpanded: () => Object.keys(get().expanded),
}));
