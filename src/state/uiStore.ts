import { create } from 'zustand';

export type PanelId = 'files' | 'snippets' | 'settings';

interface UIState {
  activePanel: PanelId | null;
  setActivePanel: (panel: PanelId | null) => void;
  togglePanel: (panel: PanelId) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activePanel: null,
  setActivePanel: (activePanel) => set({ activePanel }),
  togglePanel: (panel) => set({ activePanel: get().activePanel === panel ? null : panel }),
}));
