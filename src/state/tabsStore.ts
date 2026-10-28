import { create } from 'zustand';
import type { Tab, ViewMode } from '@/types';
import { uid } from '@/lib/id';
import { detectLanguage } from '@/lib/languageDetect';

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  initialize: (tabs: Tab[], activeTabId: string | null) => void;
  getActive: () => Tab | null;
  createTab: (init?: Partial<Tab>) => Tab;
  setActive: (id: string) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  updateContent: (id: string, content: string) => void;
  setTitle: (id: string, title: string) => void;
  markSaved: (id: string, filePath: string) => void;
  setViewMode: (id: string, mode: ViewMode) => void;
  togglePreviewSource: (id: string) => Promise<void>;
  reloadFromDisk: (filePath: string) => Promise<void>;
}

export function emptyTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: uid(),
    title: 'Untitled.md',
    filePath: null,
    content: '',
    isDirty: false,
    viewMode: 'wysiwyg',
    revision: 1,
    ...overrides,
  };
}

const initialBlankTab = emptyTab();

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [initialBlankTab],
  activeTabId: initialBlankTab.id,

  initialize: (tabs, activeTabId) => {
    if (tabs.length === 0) {
      const t = emptyTab();
      set({ tabs: [t], activeTabId: t.id });
    } else {
      set({
        tabs,
        activeTabId: activeTabId ?? tabs[0].id,
      });
    }
  },

  getActive: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },

  createTab: (init = {}) => {
    const t = emptyTab(init);
    set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.id }));
    return t;
  },

  setActive: (id) => set({ activeTabId: id }),

  closeTab: (id) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return s;
      const next = s.tabs.filter((t) => t.id !== id);
      if (next.length === 0) {
        const blank = emptyTab();
        return { tabs: [blank], activeTabId: blank.id };
      }
      let nextActive = s.activeTabId;
      if (s.activeTabId === id) {
        const fallback = next[Math.max(0, idx - 1)] ?? next[0];
        nextActive = fallback.id;
      }
      return { tabs: next, activeTabId: nextActive };
    }),

  // Same invariant as closeTab: the workspace always keeps at least one tab,
  // so closing everything leaves a fresh blank one rather than an empty editor.
  closeAllTabs: () =>
    set(() => {
      const blank = emptyTab();
      return { tabs: [blank], activeTabId: blank.id };
    }),

  updateContent: (id, content) =>
    set((s) => {
      const current = s.tabs.find((t) => t.id === id);
      if (!current || current.content === content) return s;
      return {
        tabs: s.tabs.map((t) =>
          t.id === id
          ? {
                ...t,
                content,
                isDirty: true,
                revision: t.revision + 1,
              }
            : t,
        ),
      };
    }),

  setTitle: (id, title) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    })),

  markSaved: (id, filePath) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, filePath, title: filenameFromPath(filePath), isDirty: false }
          : t,
      ),
    })),

  setViewMode: (id, mode) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, viewMode: mode } : t)),
    })),

  // Flip an editable preview (SVG) between the rendered image and its source.
  // Preview tabs are created with `content: ''` because the file was never read
  // into the editor, so going to source has to load it from disk first —
  // otherwise the editor would open blank and a save would truncate the file.
  togglePreviewSource: async (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab || !tab.filePath) return;

    if (tab.viewMode === 'preview') {
      const res = await window.heartless.files.readPath(tab.filePath);
      if (!res) return; // unreadable — stay in preview rather than blank the editor
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.id === id
            ? {
                ...t,
                content: res.content,
                viewMode: 'code' as ViewMode,
                language: detectLanguage(t.filePath!).label,
                isDirty: false,
                revision: t.revision + 1,
              }
            : t,
        ),
      }));
      return;
    }

    // Back to preview. Unsaved edits would not be reflected in the rendered
    // image, so persist them first; if the write fails, stay in the editor.
    if (tab.isDirty) {
      const ok = await window.heartless.files.save(tab.filePath, tab.content);
      if (!ok) return;
    }
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, viewMode: 'preview' as ViewMode, isDirty: false, revision: t.revision + 1 }
          : t,
      ),
    }));
  },

  reloadFromDisk: async (filePath) => {
    const res = await window.heartless.files.readPath(filePath);
    if (!res) return;
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.filePath === filePath
          ? { ...t, content: res.content, isDirty: false, revision: t.revision + 1 }
          : t,
      ),
    }));
  },
}));

export function filenameFromPath(p: string): string {
  const seg = p.split(/[\\/]/).pop();
  return seg && seg.length > 0 ? seg : 'Untitled.md';
}
