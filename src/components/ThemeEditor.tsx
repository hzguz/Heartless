import { useRef, useCallback, useState } from 'react';
import { Download, Upload, Copy, Check } from 'lucide-react';
import { useThemeStore } from '@/state/themeStore';
import { useT } from '@/lib/i18n';
import type { CustomThemeData as CustomTheme } from '@/types';

const CSS_VARS: { key: string; label: string }[] = [
  { key: '--color-paper',          label: 'Paper' },
  { key: '--color-surface',        label: 'Surface' },
  { key: '--color-surface-2',      label: 'Surface 2' },
  { key: '--color-subtle',         label: 'Subtle' },
  { key: '--color-muted',          label: 'Muted' },
  { key: '--color-text',           label: 'Text' },
  { key: '--color-text-secondary', label: 'Text Secondary' },
  { key: '--color-accent',         label: 'Accent' },
];

function resolveVar(varName: string, isDark: boolean): string {
  const root = document.documentElement;
  if (isDark && !root.classList.contains('dark')) {
    // Temporarily read dark values from the stylesheet
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText === 'html.dark') {
            const val = rule.style.getPropertyValue(varName).trim();
            if (val) return val;
          }
        }
      } catch { /* cross-origin */ }
    }
  }
  return getComputedStyle(root).getPropertyValue(varName).trim();
}

export function applyCustomTheme(theme: CustomTheme, isDark: boolean): void {
  const root = document.documentElement;
  const vars = isDark ? theme.dark : theme.light;
  for (const { key } of CSS_VARS) {
    const val = vars[key];
    if (val) root.style.setProperty(key, val);
    else root.style.removeProperty(key);
  }
}

export function clearCustomTheme(): void {
  const root = document.documentElement;
  for (const { key } of CSS_VARS) {
    root.style.removeProperty(key);
  }
}

interface Props {
  customTheme: CustomTheme | null;
  onChange: (theme: CustomTheme) => void;
  onClear: () => void;
}

export function ThemeEditor({ customTheme, onChange, onClear }: Props) {
  const t = useT();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const importRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const pendingThemeRef = useRef<CustomTheme | null>(null);

  const getCurrentVars = (): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const { key } of CSS_VARS) {
      result[key] = resolveVar(key, isDark);
    }
    return result;
  };

  const getOrInitTheme = (): CustomTheme => {
    if (customTheme) return customTheme;
    return {
      name: 'Custom',
      light: CSS_VARS.reduce<Record<string, string>>((acc, { key }) => {
        acc[key] = resolveVar(key, false);
        return acc;
      }, {}),
      dark: CSS_VARS.reduce<Record<string, string>>((acc, { key }) => {
        acc[key] = resolveVar(key, true);
        return acc;
      }, {}),
    };
  };

  const flushPendingTheme = useCallback(() => {
    if (pendingThemeRef.current) {
      onChange(pendingThemeRef.current);
      pendingThemeRef.current = null;
    }
  }, [onChange]);

  const handleColorChange = (varKey: string, value: string) => {
    const base = pendingThemeRef.current ?? getOrInitTheme();
    const side = isDark ? 'dark' : 'light';
    const next: CustomTheme = { ...base, [side]: { ...base[side], [varKey]: value } };

    // Apply immediately to DOM for zero-lag visual feedback
    applyCustomTheme(next, isDark);

    // Debounce the store update to avoid re-rendering on every drag pixel
    pendingThemeRef.current = next;
    if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(flushPendingTheme, 150);
  };

  const handleExport = () => {
    const theme = getOrInitTheme();
    // Snapshot current live values into the appropriate side before exporting
    const side = isDark ? 'dark' : 'light';
    theme[side] = getCurrentVars();
    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name.replace(/\s+/g, '-').toLowerCase()}.heartless-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as CustomTheme;
        if (!parsed.light || !parsed.dark) throw new Error('Invalid theme file');
        applyCustomTheme(parsed, isDark);
        onChange(parsed);
      } catch {
        // ignore malformed files silently
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  const varMap = isDark ? (customTheme?.dark ?? {}) : (customTheme?.light ?? {});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hexInputs, setHexInputs] = useState<Record<string, string>>({});

  const handleCopy = (varKey: string, hex: string) => {
    void navigator.clipboard.writeText(hex);
    setCopiedKey(varKey);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleHexInput = (varKey: string, raw: string) => {
    setHexInputs((prev) => ({ ...prev, [varKey]: raw }));
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      handleColorChange(varKey, normalized);
    }
  };

  const handleHexBlur = (varKey: string, fallback: string) => {
    setHexInputs((prev) => {
      const next = { ...prev };
      delete next[varKey];
      return next;
    });
    // If the input left an invalid value, reset to current resolved value
    const raw = hexInputs[varKey] ?? '';
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (raw && !/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      handleColorChange(varKey, fallback);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[11px] text-muted">{isDark ? t('settings.theme.dark') : t('settings.theme.light')}</span>
        <div className="flex items-center gap-1">
          {customTheme && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] text-muted transition-colors hover:bg-surface hover:text-text-primary"
            >
              {t('settings.theme.reset')}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            title={t('settings.theme.export')}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-muted transition-colors hover:bg-surface hover:text-text-primary"
          >
            <Download size={12} />
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            title={t('settings.theme.import')}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-muted transition-colors hover:bg-surface hover:text-text-primary"
          >
            <Upload size={12} />
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {CSS_VARS.map(({ key, label }) => {
        const resolved = varMap[key] ?? resolveVar(key, isDark);
        const hexValue = resolved.startsWith('#') ? resolved : '#888888';
        const displayValue = hexInputs[key] ?? hexValue;
        const isCopied = copiedKey === key;

        return (
          <div key={key} className="flex items-center justify-between rounded-[6px] px-2 py-1 hover:bg-surface">
            <span className="text-[12px] text-text-primary">{label}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCopy(key, hexValue)}
                title="Copy hex"
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: isCopied ? 'var(--color-accent)' : 'var(--color-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = isCopied ? 'var(--color-accent)' : 'var(--color-muted)'; }}
              >
                {isCopied ? <Check size={11} /> : <Copy size={11} />}
              </button>
              <input
                type="text"
                value={displayValue}
                onChange={(e) => handleHexInput(key, e.target.value)}
                onBlur={() => handleHexBlur(key, hexValue)}
                onFocus={(e) => e.target.select()}
                maxLength={7}
                spellCheck={false}
                className="w-[68px] rounded-[4px] border border-transparent bg-transparent px-1 py-0.5 text-center text-[11px] font-mono outline-none transition-colors"
                style={{ color: 'var(--color-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-subtle)'; }}
                onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'transparent'; }}
                onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
              />
              <label className="cursor-pointer">
                <span
                  className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-[4px] border border-subtle"
                  style={{ backgroundColor: hexValue }}
                >
                  <input
                    type="color"
                    value={hexValue}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </span>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
