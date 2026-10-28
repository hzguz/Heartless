import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { TitleBar } from './components/TitleBar';
import { Workspace } from './components/Workspace';
import { SnippetsSidebar } from './components/SnippetsSidebar';
import { FileExplorerSidebar } from './components/FileExplorerSidebar';
import { SettingsSidebar } from './components/SettingsSidebar';
import { ActivityBar } from './components/ActivityBar';
import { StatusBar } from './components/StatusBar';
import { useTabsStore } from './state/tabsStore';
import { useSnippetsStore } from './state/snippetsStore';
import { useFilesStore } from './state/filesStore';
import { useUIStore } from './state/uiStore';
import { useThemeStore } from './state/themeStore';
import { useI18nStore } from './lib/i18n';
import { getPlatform } from './lib/platform';
import { registerGlobalShortcuts } from './lib/keybindings';
import {
  fileOpen,
  fileSave,
  fileSaveAs,
  fileExport,
  fileNewTab,
  fileCloseActiveTab,
  fileCloseAllTabs,
  openFileByPath,
} from './lib/fileActions';
import type { PersistedSession, Tab } from './types';
import { isLargeContent } from './lib/largeFiles';
import { isCodeFile, detectLanguage } from './lib/languageDetect';
import { isLegacyCustomTheme, parseCustomTheme } from './lib/customTheme';

export default function App() {
  const initialize = useTabsStore((s) => s.initialize);
  const active = useTabsStore((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? null);
  const refreshSnippets = useSnippetsStore((s) => s.refresh);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const activePanel = useUIStore((s) => s.activePanel);
  const theme = useThemeStore((s) => s.theme);
  const themePref = useThemeStore((s) => s.themePref);
  const setThemePref = useThemeStore((s) => s.setThemePref);
  const setSystemTheme = useThemeStore((s) => s.setSystemTheme);
  const minimalMode = useThemeStore((s) => s.minimalMode);
  const setMinimalMode = useThemeStore((s) => s.setMinimalMode);
  const customTheme = useThemeStore((s) => s.customTheme);
  const setCustomTheme = useThemeStore((s) => s.setCustomTheme);
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  const [ready, setReady] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const lastSavedSessionJsonRef = useRef<string>('');

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  useEffect(() => {
    (async () => {
      const [platform, session, systemTheme] = await Promise.all([
        getPlatform(),
        window.heartless.session.load() as Promise<PersistedSession | null>,
        window.heartless.theme.getSystem(),
      ]);
      setIsMac(platform === 'darwin');
      if (session && session.tabs && session.tabs.length > 0) {
        const hydrated: Tab[] = session.tabs.map((t) => {
          const largeFileMode = t.largeFileMode || isLargeContent(t.content);
          // Auto-detect code files from filePath, even if persisted as wysiwyg
          let viewMode = t.viewMode;
          let language = t.language;
          if (t.filePath && isCodeFile(t.filePath) && t.viewMode !== 'code' && t.viewMode !== 'preview') {
            viewMode = 'code';
            language = detectLanguage(t.filePath).label;
          }
          return {
            ...t,
            viewMode,
            language,
            isDirty: false,
            largeFileMode,
            revision: t.revision ?? 1,
          };
        });
        initialize(hydrated, session.activeTabId);
        if (session.snippetsOpen) setActivePanel('snippets');
        else if (session.activePanel) setActivePanel(session.activePanel);
      }
      setSystemTheme(systemTheme);
      const persistedPref = session?.themePref
        ?? (session?.theme === 'dark' || session?.theme === 'light' || session?.theme === 'cream' ? session.theme : 'system');
      // The custom theme must be in the store before the preference is applied,
      // since selecting 'custom' paints from it.
      const legacySide = persistedPref === 'dark' || (persistedPref === 'system' && systemTheme === 'dark') ? 'dark' : 'light';
      const restoredCustomTheme = parseCustomTheme(session?.customTheme, legacySide);
      if (restoredCustomTheme) setCustomTheme(restoredCustomTheme);
      // A legacy custom theme was always painted over whatever theme was chosen;
      // selecting 'custom' keeps the look the user had before the upgrade.
      setThemePref(restoredCustomTheme && isLegacyCustomTheme(session?.customTheme) ? 'custom' : persistedPref);
      if (typeof session?.minimalMode === 'boolean') {
        setMinimalMode(session.minimalMode);
      }
      if (session?.language === 'en' || session?.language === 'pt' || session?.language === 'ja') {
        setLanguage(session.language);
      } else {
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith('pt')) setLanguage('pt');
        else if (navLang.startsWith('ja')) setLanguage('ja');
        else setLanguage('en');
      }
      void refreshSnippets();
      if (session?.filesRootPath) {
        void useFilesStore
          .getState()
          .hydrate(session.filesRootPath, session.filesExpanded ?? []);
      }
      setReady(true);
    })();
  }, [initialize, refreshSnippets, setActivePanel, setThemePref, setSystemTheme, setMinimalMode, setCustomTheme, setLanguage]);

  useEffect(() => {
    if (!ready) return;
    const handler = () => {
      (window as Window & { __heartlessFlushActiveEditor?: () => void }).__heartlessFlushActiveEditor?.();
      const tabsState = useTabsStore.getState();
      const filesState = useFilesStore.getState();
      const data: PersistedSession = {
        tabs: tabsState.tabs.map((t) => ({
          id: t.id,
          title: t.title,
          filePath: t.filePath,
          content: t.content,
          viewMode: t.viewMode,
          revision: t.revision,
          largeFileMode: t.largeFileMode,
          language: t.language,
        })),
        activeTabId: tabsState.activeTabId,
        snippetsOpen: activePanel === 'snippets',
        activePanel,
        theme,
        themePref,
        minimalMode,
        customTheme,
        language,
        filesRootPath: filesState.rootPath,
        filesExpanded: filesState.serializeExpanded(),
      };
      const serialized = JSON.stringify(data);
      if (serialized === lastSavedSessionJsonRef.current) return;
      lastSavedSessionJsonRef.current = serialized;
      void window.heartless.session.save(data);
    };
    const interval = window.setInterval(handler, 4000);
    window.addEventListener('beforeunload', handler);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', handler);
      handler();
    };
  }, [ready, activePanel, theme, themePref, minimalMode, customTheme, language]);

  // React to OS theme changes (only matters when themePref === 'system').
  useEffect(() => {
    const off = window.heartless.theme.onSystemChange((next) => {
      setSystemTheme(next);
    });
    return off;
  }, [setSystemTheme]);

  // Wire native menu (File → Open/Save/Save As/Export/New Tab/Close Tab).
  // Guard for older preload bundles that don't expose `menu` yet — restart
  // the Electron process (not just the renderer) to pick it up.
  useEffect(() => {
    const m = window.heartless?.menu;
    if (!m) {
      console.warn('window.heartless.menu unavailable — restart Electron to load the new preload.');
      return;
    }
    const offs = [
      m.on('menu:open', () => { void fileOpen(); }),
      m.on('menu:save', () => { void fileSave(); }),
      m.on('menu:save-as', () => { void fileSaveAs(); }),
      m.on('menu:export', () => { void fileExport(); }),
      m.on('menu:new-tab', () => { fileNewTab(); }),
      m.on('menu:close-tab', () => { fileCloseActiveTab(); }),
      m.on('menu:close-all-tabs', () => { void fileCloseAllTabs(); }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Register global keyboard shortcuts (Ctrl/Cmd + S, O, N, W, E, Shift+S).
  // On Windows the native app menu is suppressed, so accelerators don't fire;
  // this listener brings the same keybindings to all platforms.
  useEffect(() => registerGlobalShortcuts(), []);

  // Files opened from the OS: double-click, "Open with", or a drop on the dock.
  // Waits for `ready` so hydration has already restored the session — otherwise
  // the file could be opened and then replaced by the persisted tabs.
  useEffect(() => {
    if (!ready) return;
    const off = window.heartless.files.onOpenPath((filePath) => {
      void openFileByPath(filePath);
    });
    // Drain anything queued before this listener existed (cold launch).
    void window.heartless.files.pending().then((paths) => {
      for (const filePath of paths) void openFileByPath(filePath);
    });
    return off;
  }, [ready]);

  // macOS keeps its window buttons in the top-left, so the chrome moves right
  // to leave that corner to the TitleBar. Windows/Linux put theirs top-right,
  // where the rail would collide with them — there the chrome stays left.
  const chromeOnRight = isMac;

  // The rail is always the outermost column, with the panels tucked inside it.
  const chrome = (
    <>
      {!chromeOnRight && <ActivityBar />}
      <FileExplorerSidebar side={chromeOnRight ? 'right' : 'left'} />
      <SnippetsSidebar side={chromeOnRight ? 'right' : 'left'} editor={editorRef.current} />
      <SettingsSidebar side={chromeOnRight ? 'right' : 'left'} />
      {chromeOnRight && <ActivityBar />}
    </>
  );

  return (
    <div className="flex h-full w-full bg-paper text-text-primary">
      {!chromeOnRight && chrome}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TitleBar isMac={isMac} editor={editorRef.current} />

        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <main className="relative flex flex-1 min-h-0 min-w-0 overflow-hidden">
              {active && (
                <Workspace
                  key={active.id}
                  tab={active}
                  onEditorReady={handleEditorReady}
                />
              )}
            </main>
            <StatusBar active={active} />
          </div>

        </div>
      </div>

      {chromeOnRight && chrome}
    </div>
  );
}
