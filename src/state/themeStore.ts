import { create } from 'zustand';
import type { CustomThemeData, ThemePreference } from '@/types';

export type Theme = 'light' | 'dark' | 'cream';

interface ThemeState {
  theme: Theme;
  themePref: ThemePreference;
  systemTheme: Theme;
  minimalMode: boolean;
  customTheme: CustomThemeData | null;
  setThemePref: (pref: ThemePreference) => void;
  setSystemTheme: (t: Theme) => void;
  setMinimalMode: (minimal: boolean) => void;
  toggleMinimal: () => void;
  setCustomTheme: (theme: CustomThemeData | null) => void;
}

function applyTheme(t: Theme): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'cream');
  if (t === 'dark') root.classList.add('dark');
  else if (t === 'cream') root.classList.add('cream');
  // Update native window controls (Windows) so they don't look out of place.
  void window.heartless?.window?.setOverlay?.(t);
}

function resolve(pref: ThemePreference, systemTheme: Theme): Theme {
  if (pref === 'system') return systemTheme;
  return pref;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  themePref: 'system',
  systemTheme: 'light',
  minimalMode: false,
  customTheme: null,

  setThemePref: (themePref) => {
    const theme = resolve(themePref, get().systemTheme);
    applyTheme(theme);
    set({ themePref, theme });
  },

  setSystemTheme: (systemTheme) => {
    set({ systemTheme });
    if (get().themePref === 'system') {
      applyTheme(systemTheme);
      set({ theme: systemTheme });
    }
  },

  setMinimalMode: (minimalMode) => set({ minimalMode }),
  toggleMinimal: () => set((s) => ({ minimalMode: !s.minimalMode })),
  setCustomTheme: (customTheme) => set({ customTheme }),
}));
