import { create } from 'zustand';
import type { BaseTheme, CustomThemeData, ThemePreference } from '@/types';
import { applyCustomColors, clearCustomColors, createCustomTheme } from '@/lib/customTheme';

export type Theme = BaseTheme;

interface ThemeState {
  theme: Theme;
  themePref: ThemePreference;
  systemTheme: Theme;
  minimalMode: boolean;
  /** Kept while another theme is selected, so switching back restores it. */
  customTheme: CustomThemeData | null;
  setThemePref: (pref: ThemePreference) => void;
  setSystemTheme: (t: Theme) => void;
  setMinimalMode: (minimal: boolean) => void;
  toggleMinimal: () => void;
  setCustomTheme: (theme: CustomThemeData | null) => void;
}

const PAPER_VAR = '--color-paper';
const TEXT_VAR = '--color-text';

function applyTheme(t: Theme, customColors?: Record<string, string>): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'cream');
  if (t === 'dark') root.classList.add('dark');
  else if (t === 'cream') root.classList.add('cream');
  // Update native window controls (Windows) so they don't look out of place —
  // with a custom theme they must follow its paper/text, not the base palette.
  const overlay = customColors
    ? { color: customColors[PAPER_VAR], symbolColor: customColors[TEXT_VAR] }
    : undefined;
  void window.heartless?.window?.setOverlay?.(t, overlay);
}

function resolve(pref: Exclude<ThemePreference, 'custom'>, systemTheme: Theme): Theme {
  if (pref === 'system') return systemTheme;
  return pref;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  themePref: 'system',
  systemTheme: 'light',
  minimalMode: false,
  customTheme: null,

  // Custom colours are inline overrides on <html>, so they must exist only while
  // the custom theme is selected — left behind, they beat every other theme's
  // tokens and the app renders half one theme, half another.
  setThemePref: (themePref) => {
    if (themePref === 'custom') {
      const customTheme = get().customTheme ?? createCustomTheme(get().theme);
      applyTheme(customTheme.base, customTheme.colors);
      applyCustomColors(customTheme.colors);
      set({ themePref, theme: customTheme.base, customTheme });
      return;
    }
    clearCustomColors();
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

  setCustomTheme: (customTheme) => {
    set({ customTheme });
    if (get().themePref !== 'custom') return;
    if (customTheme) {
      applyTheme(customTheme.base, customTheme.colors);
      applyCustomColors(customTheme.colors);
      set({ theme: customTheme.base });
    } else {
      get().setThemePref('system');
    }
  },
}));
