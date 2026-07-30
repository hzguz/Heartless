import { create } from 'zustand';
import type { SnippetMeta } from '@/types';

interface SnippetsState {
  list: SnippetMeta[];
  refresh: () => Promise<void>;
  create: (name: string, body: string) => Promise<SnippetMeta>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  read: (id: string) => Promise<string>;
}

export const useSnippetsStore = create<SnippetsState>((set, get) => ({
  list: [],
  refresh: async () => {
    const list = await window.heartless.snippets.list();
    set({ list });
  },
  create: async (name, body) => {
    const meta = await window.heartless.snippets.create(name, body);
    await get().refresh();
    return meta;
  },
  remove: async (id) => {
    await window.heartless.snippets.delete(id);
    await get().refresh();
  },
  rename: async (id, name) => {
    await window.heartless.snippets.rename(id, name);
    await get().refresh();
  },
  read: async (id) => window.heartless.snippets.read(id),
}));
