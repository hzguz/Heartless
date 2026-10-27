import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/state/themeStore';
import { useUIStore } from '@/state/uiStore';
import { useI18nStore, useT } from '@/lib/i18n';
import { ThemeEditor } from './ThemeEditor';
import { SidebarPanel, type SidebarSide } from './SidebarPanel';
import { Segmented, type SegmentedOption } from './Segmented';
import { Dropdown, type DropdownOption } from './Dropdown';
import type { Language, ThemePreference } from '@/types';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-[8px] px-2 py-2 text-left transition-colors hover:bg-surface"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-text-primary">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted leading-snug">{description}</p>
        )}
      </div>
      <span
        className="relative flex h-4 w-7 shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? 'var(--color-accent)' : 'var(--color-subtle)' }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute h-3 w-3 rounded-full bg-paper"
          style={{ left: checked ? 14 : 2 }}
        />
      </span>
    </button>
  );
}

function SettingRow({
  label, description, control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="px-2 py-2">
      <p className="text-[12.5px] text-text-primary">{label}</p>
      {description && (
        <p className="mt-0.5 mb-2 text-[11px] text-muted leading-snug">{description}</p>
      )}
      <div className={description ? '' : 'mt-2'}>{control}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-3 pb-1 text-[11px] font-medium text-muted">
      {children}
    </p>
  );
}

export function SettingsSidebar({ side }: { side: SidebarSide }) {
  const t = useT();
  const open = useUIStore((s) => s.activePanel === 'settings');
  const [colorEditorOpen, setColorEditorOpen] = useState(false);
  const themePref = useThemeStore((s) => s.themePref);
  const setThemePref = useThemeStore((s) => s.setThemePref);
  const minimalMode = useThemeStore((s) => s.minimalMode);
  const toggleMinimal = useThemeStore((s) => s.toggleMinimal);
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  const themeOptions: DropdownOption<ThemePreference>[] = [
    { value: 'system', label: t('settings.theme.system') },
    { value: 'light',  label: t('settings.theme.light') },
    { value: 'cream',  label: t('settings.theme.cream') },
    { value: 'dark',   label: t('settings.theme.dark') },
    { value: 'custom', label: t('settings.theme.custom') },
  ];

  const languageOptions: SegmentedOption<Language>[] = [
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' },
    { value: 'ja', label: '日本語' },
  ];

  return (
    <SidebarPanel panelKey="settings-sidebar" open={open} side={side}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-subtle">
              <span className="text-[12px] font-medium text-text-secondary">
                {t('panel.settings')}
              </span>
            </div>

            <div className="flex flex-col px-3 py-2 overflow-y-auto app-scrollbar flex-1 min-h-0">
              <SectionTitle>{t('settings.appearance')}</SectionTitle>
              <SettingRow
                label={t('settings.theme')}
                control={
                  <Dropdown
                    options={themeOptions}
                    value={themePref}
                    onChange={setThemePref}
                    ariaLabel={t('settings.theme')}
                  />
                }
              />

              <SectionTitle>{t('settings.language')}</SectionTitle>
              <SettingRow
                label={t('settings.language')}
                control={<Segmented options={languageOptions} value={language} onChange={setLanguage} />}
              />

              <SectionTitle>{t('settings.behavior')}</SectionTitle>
              <ToggleRow
                label={t('settings.minimal')}
                description={t('settings.minimal.desc')}
                checked={minimalMode}
                onChange={toggleMinimal}
              />
            </div>

            {/* Color editor — fixed at bottom, expands upward */}
            <div className="shrink-0 border-t border-subtle">
              <button
                type="button"
                onClick={() => setColorEditorOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3 text-left"
              >
                <span className="text-[11px] font-medium text-muted">{t('settings.theme.editor')}</span>
                <motion.span
                  animate={{ rotate: colorEditorOpen ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-muted"
                >
                  <ChevronRight size={12} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {colorEditorOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0, 0, 1] }}
                    className="overflow-hidden px-3 pb-3"
                  >
                    <ThemeEditor />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
    </SidebarPanel>
  );
}
