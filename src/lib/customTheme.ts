import type { BaseTheme, CustomThemeData } from '@/types';

/** The tokens a custom theme may override — the Theme Editor's rows. */
export const THEME_COLOR_VARS: readonly { key: string; label: string }[] = [
  { key: '--color-paper',          label: 'Paper' },
  { key: '--color-surface',        label: 'Surface' },
  { key: '--color-surface-2',      label: 'Surface 2' },
  { key: '--color-subtle',         label: 'Subtle' },
  { key: '--color-muted',          label: 'Muted' },
  { key: '--color-text',           label: 'Text' },
  { key: '--color-text-secondary', label: 'Text Secondary' },
  { key: '--color-accent',         label: 'Accent' },
];

export const BASE_THEMES: readonly BaseTheme[] = ['light', 'cream', 'dark'];

const DEFAULT_THEME_NAME = 'Custom';
const MAX_THEME_NAME_LENGTH = 60;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const KNOWN_VARS = new Set(THEME_COLOR_VARS.map(({ key }) => key));

// Each base theme's own token block in globals.css; light lives on :root and
// the others only override part of it, so :root is always read first.
const THEME_SELECTORS: Record<BaseTheme, string> = {
  light: ':root',
  cream: 'html.cream',
  dark: 'html.dark',
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBaseTheme(value: unknown): value is BaseTheme {
  return typeof value === 'string' && (BASE_THEMES as readonly string[]).includes(value);
}

/** Keeps only known tokens with `#RRGGBB` values — the file may come from anyone. */
function sanitizeColors(raw: UnknownRecord): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (KNOWN_VARS.has(key) && typeof value === 'string' && HEX_COLOR.test(value)) {
      colors[key] = value;
    }
  }
  return colors;
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_THEME_NAME;
  const name = raw.trim().slice(0, MAX_THEME_NAME_LENGTH);
  return name || DEFAULT_THEME_NAME;
}

/** Pre-"Personalizado" themes stored a light and a dark palette side by side. */
export function isLegacyCustomTheme(raw: unknown): boolean {
  return isRecord(raw) && !('colors' in raw) && isRecord(raw.light) && isRecord(raw.dark);
}

/**
 * Validates a custom theme from the session or an imported file. Legacy
 * two-palette themes are reduced to the side the user was actually looking at
 * (`legacySide`), since that is the palette they had been editing.
 */
export function parseCustomTheme(raw: unknown, legacySide: 'light' | 'dark' = 'light'): CustomThemeData | null {
  if (!isRecord(raw)) return null;
  const name = sanitizeName(raw.name);

  if (isBaseTheme(raw.base) && isRecord(raw.colors)) {
    return { name, base: raw.base, colors: sanitizeColors(raw.colors) };
  }
  if (isLegacyCustomTheme(raw)) {
    const side = raw[legacySide] as UnknownRecord;
    return { name, base: legacySide, colors: sanitizeColors(side) };
  }
  return null;
}

/* ── DOM side ─────────────────────────────────────────────────────────────── */

export function applyCustomColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const { key } of THEME_COLOR_VARS) {
    const value = colors[key];
    if (value) root.style.setProperty(key, value);
    else root.style.removeProperty(key);
  }
}

export function clearCustomColors(): void {
  const root = document.documentElement;
  for (const { key } of THEME_COLOR_VARS) {
    root.style.removeProperty(key);
  }
}

function readSelectorColors(selector: string, into: Record<string, string>): void {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule) || rule.selectorText !== selector) continue;
      for (const { key } of THEME_COLOR_VARS) {
        const value = rule.style.getPropertyValue(key).trim();
        if (value) into[key] = value;
      }
    }
  }
}

/**
 * A base theme's stock colors, read from the stylesheet rather than computed
 * style so that active custom overrides and the current theme class don't leak in.
 */
export function readBaseThemeColors(base: BaseTheme): Record<string, string> {
  const colors: Record<string, string> = {};
  readSelectorColors(THEME_SELECTORS.light, colors);
  if (base !== 'light') readSelectorColors(THEME_SELECTORS[base], colors);
  return colors;
}

export function createCustomTheme(base: BaseTheme, name = DEFAULT_THEME_NAME): CustomThemeData {
  return { name, base, colors: readBaseThemeColors(base) };
}
