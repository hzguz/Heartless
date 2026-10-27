import { useRef, useCallback, useMemo, useState } from 'react';
import { Download, Upload, Copy, Check } from 'lucide-react';
import { useThemeStore } from '@/state/themeStore';
import { useT } from '@/lib/i18n';
import {
  THEME_COLOR_VARS,
  applyCustomColors,
  createCustomTheme,
  parseCustomTheme,
  readBaseThemeColors,
} from '@/lib/customTheme';
import type { BaseTheme, CustomThemeData } from '@/types';
import { Segmented, type SegmentedOption } from './Segmented';

const STORE_SYNC_DELAY = 150;
const COPIED_FEEDBACK_MS = 1500;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_SWATCH = '#888888';
const THEME_FILE_SUFFIX = '.heartless-theme.json';

const ICON_BUTTON =
  'flex h-6 w-6 items-center justify-center rounded-[5px] text-muted transition-colors hover:bg-surface hover:text-text-primary';

/**
 * Colours are editable only while the Custom theme is selected; any other
 * theme shows its stock palette untouched. Editing in place would otherwise
 * have to silently replace a saved custom theme.
 */
export function ThemeEditor() {
  const t = useT();
  const theme = useThemeStore((s) => s.theme);
  const themePref = useThemeStore((s) => s.themePref);
  const customTheme = useThemeStore((s) => s.customTheme);
  const setThemePref = useThemeStore((s) => s.setThemePref);
  const setCustomTheme = useThemeStore((s) => s.setCustomTheme);
  const importRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-imported
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed: CustomThemeData | null = null;
      try {
        parsed = parseCustomTheme(JSON.parse(String(ev.target?.result)), theme === 'dark' ? 'dark' : 'light');
      } catch {
        // malformed JSON — ignored like an invalid theme
      }
      if (!parsed) return;
      setCustomTheme(parsed);
      setThemePref('custom');
    };
    reader.readAsText(file);
  };

  const importButton = (
    <>
      <button type="button" onClick={() => importRef.current?.click()} title={t('settings.theme.import')} className={ICON_BUTTON}>
        <Upload size={12} />
      </button>
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </>
  );

  if (themePref !== 'custom' || !customTheme) {
    const startCustomizing = () => {
      if (!customTheme) setCustomTheme(createCustomTheme(theme));
      setThemePref('custom');
    };
    return (
      <div className="flex flex-col gap-2 px-2">
        <p className="text-[11px] leading-snug text-muted">{t('settings.theme.editor.hint')}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startCustomizing}
            className="flex-1 rounded-[6px] border border-subtle px-2 py-1 text-[11.5px] text-text-primary transition-colors hover:bg-surface"
          >
            {customTheme ? t('settings.theme.editCustom') : t('settings.theme.customize')}
          </button>
          {importButton}
        </div>
      </div>
    );
  }

  return <CustomThemeColors customTheme={customTheme} importButton={importButton} />;
}

interface CustomThemeColorsProps {
  customTheme: CustomThemeData;
  importButton: React.ReactNode;
}

function CustomThemeColors({ customTheme, importButton }: CustomThemeColorsProps) {
  const t = useT();
  const setCustomTheme = useThemeStore((s) => s.setCustomTheme);
  const debounceTimerRef = useRef<number | null>(null);
  const pendingThemeRef = useRef<CustomThemeData | null>(null);
  const baseColors = useMemo(() => readBaseThemeColors(customTheme.base), [customTheme.base]);

  const flushPendingTheme = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const pending = pendingThemeRef.current;
    pendingThemeRef.current = null;
    if (pending) setCustomTheme(pending);
    return pending;
  }, [setCustomTheme]);

  /** Latest theme, including edits still waiting for the debounced store sync. */
  const currentTheme = () => pendingThemeRef.current ?? customTheme;

  const handleColorChange = (varKey: string, value: string) => {
    const base = currentTheme();
    const next: CustomThemeData = { ...base, colors: { ...base.colors, [varKey]: value } };
    // Apply immediately to DOM for zero-lag visual feedback
    applyCustomColors(next.colors);
    // Debounce the store update to avoid re-rendering on every drag pixel
    pendingThemeRef.current = next;
    if (debounceTimerRef.current !== null) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(flushPendingTheme, STORE_SYNC_DELAY);
  };

  const handleBaseChange = (base: BaseTheme) => {
    const latest = flushPendingTheme() ?? customTheme;
    setCustomTheme({ ...latest, base });
  };

  const handleReset = () => {
    flushPendingTheme();
    setCustomTheme(createCustomTheme(customTheme.base, customTheme.name));
  };

  const handleExport = () => {
    const latest = flushPendingTheme() ?? customTheme;
    const blob = new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${latest.name.replace(/\s+/g, '-').toLowerCase()}${THEME_FILE_SUFFIX}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const baseOptions: SegmentedOption<BaseTheme>[] = [
    { value: 'light', label: t('settings.theme.light') },
    { value: 'cream', label: t('settings.theme.cream') },
    { value: 'dark',  label: t('settings.theme.dark') },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="px-2 pb-2">
        <p className="mb-1.5 text-[11px] text-muted">{t('settings.theme.base')}</p>
        <Segmented options={baseOptions} value={customTheme.base} onChange={handleBaseChange} />
        <p className="mt-1.5 text-[10.5px] leading-snug text-muted">{t('settings.theme.base.desc')}</p>
      </div>

      <div className="flex items-center justify-end gap-1 px-2 pb-1">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] text-muted transition-colors hover:bg-surface hover:text-text-primary"
        >
          {t('settings.theme.reset')}
        </button>
        <button type="button" onClick={handleExport} title={t('settings.theme.export')} className={ICON_BUTTON}>
          <Download size={12} />
        </button>
        {importButton}
      </div>

      {THEME_COLOR_VARS.map(({ key, label }) => {
        const resolved = customTheme.colors[key] ?? baseColors[key] ?? '';
        return (
          <ColorRow
            key={key}
            label={label}
            value={HEX_COLOR.test(resolved) ? resolved : FALLBACK_SWATCH}
            onChange={(value) => handleColorChange(key, value)}
          />
        );
      })}
    </div>
  );
}

interface ColorRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  const handleDraft = (raw: string) => {
    setDraft(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX_COLOR.test(normalized)) onChange(normalized);
  };

  return (
    <div className="flex items-center justify-between rounded-[6px] px-2 py-1 hover:bg-surface">
      <span className="text-[12px] text-text-primary">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopy}
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
          value={draft ?? value}
          onChange={(e) => handleDraft(e.target.value)}
          // An invalid draft is simply discarded: the field falls back to the last valid colour.
          onBlur={() => setDraft(null)}
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
            style={{ backgroundColor: value }}
          >
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </span>
        </label>
      </div>
    </div>
  );
}
