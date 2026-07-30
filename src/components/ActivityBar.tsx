import { FolderClosed, Bookmark, Settings } from 'lucide-react';
import { useUIStore, type PanelId } from '@/state/uiStore';
import { useThemeStore } from '@/state/themeStore';
import { useT } from '@/lib/i18n';

interface ActivityButtonProps {
  panel: PanelId;
  title: string;
  children: React.ReactNode;
}

function ActivityButton({ panel, title, children }: ActivityButtonProps) {
  const active = useUIStore((s) => s.activePanel === panel);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  let backgroundColor = 'transparent';
  let color: string;

  if (active) {
    if (isDark) {
      backgroundColor = 'var(--color-accent)';
      // Paper is the theme's own contrast surface, so this tracks custom themes
      // instead of assuming the accent fill is always dark enough for white.
      color = 'var(--color-paper)';
    } else {
      backgroundColor = 'color-mix(in srgb, var(--color-accent) 12%, transparent)';
      color = 'var(--color-accent)';
    }
  } else {
    color = 'var(--color-text-secondary)';
  }

  return (
    <button
      type="button"
      onClick={() => togglePanel(panel)}
      title={title}
      className="no-drag relative flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors"
      style={{ color, backgroundColor }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}


export function ActivityBar() {
  const t = useT();
  const minimalMode = useThemeStore((s) => s.minimalMode);
  if (minimalMode) return null;

  return (
    <aside className="app-drag flex h-full w-12 shrink-0 flex-col items-center justify-between bg-surface py-2">
      <div className="flex flex-col items-center gap-1">
        <ActivityButton panel="files" title={t('panel.files')}>
          <FolderClosed size={16} />
        </ActivityButton>
        <ActivityButton panel="snippets" title={t('panel.snippets')}>
          <Bookmark size={16} />
        </ActivityButton>
      </div>

      <div className="flex flex-col items-center gap-1">
        <ActivityButton panel="settings" title={t('panel.settings')}>
          <Settings size={16} />
        </ActivityButton>
      </div>
    </aside>
  );
}
