import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CommandId } from '@/types';

interface MenuItemAction {
  kind: 'action';
  label: string;
  shortcut?: string;
  command: CommandId;
}

interface MenuItemSeparator {
  kind: 'separator';
}

type MenuItem = MenuItemAction | MenuItemSeparator;

interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

const MOD = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';

const MENUS: MenuDefinition[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { kind: 'action', label: 'New Tab',   shortcut: `${MOD}+N`,       command: 'file:new-tab' },
      { kind: 'separator' },
      { kind: 'action', label: 'Open…',     shortcut: `${MOD}+O`,       command: 'file:open' },
      { kind: 'separator' },
      { kind: 'action', label: 'Save',      shortcut: `${MOD}+S`,       command: 'file:save' },
      { kind: 'action', label: 'Save As…',  shortcut: `${MOD}+Shift+S`, command: 'file:save-as' },
      { kind: 'action', label: 'Export…',   shortcut: `${MOD}+E`,       command: 'file:export' },
      { kind: 'separator' },
      { kind: 'action', label: 'Close Tab', shortcut: `${MOD}+W`,       command: 'file:close-tab' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { kind: 'action', label: 'Undo',       shortcut: `${MOD}+Z`,       command: 'edit:undo' },
      { kind: 'action', label: 'Redo',       shortcut: `${MOD}+Shift+Z`, command: 'edit:redo' },
      { kind: 'separator' },
      { kind: 'action', label: 'Cut',        shortcut: `${MOD}+X`,       command: 'edit:cut' },
      { kind: 'action', label: 'Copy',       shortcut: `${MOD}+C`,       command: 'edit:copy' },
      { kind: 'action', label: 'Paste',      shortcut: `${MOD}+V`,       command: 'edit:paste' },
      { kind: 'action', label: 'Select All', shortcut: `${MOD}+A`,       command: 'edit:select-all' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { kind: 'action', label: 'Reload',             shortcut: `${MOD}+R`,       command: 'view:reload' },
      { kind: 'action', label: 'Force Reload',       shortcut: `${MOD}+Shift+R`, command: 'view:force-reload' },
      { kind: 'action', label: 'Toggle DevTools',    shortcut: `${MOD}+Shift+I`, command: 'view:toggle-devtools' },
      { kind: 'separator' },
      { kind: 'action', label: 'Reset Zoom',         shortcut: `${MOD}+0`,       command: 'view:reset-zoom' },
      { kind: 'action', label: 'Zoom In',            shortcut: `${MOD}++`,       command: 'view:zoom-in' },
      { kind: 'action', label: 'Zoom Out',           shortcut: `${MOD}+-`,       command: 'view:zoom-out' },
      { kind: 'separator' },
      { kind: 'action', label: 'Toggle Fullscreen', shortcut: 'F11',             command: 'view:toggle-fullscreen' },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    items: [
      { kind: 'action', label: 'Close All Tabs', shortcut: `${MOD}+Shift+W`, command: 'file:close-all-tabs' },
      { kind: 'separator' },
      { kind: 'action', label: 'Minimize', command: 'window:minimize' },
      { kind: 'action', label: 'Maximize / Restore', command: 'window:maximize-toggle' },
      { kind: 'separator' },
      { kind: 'action', label: 'Close', command: 'window:close' },
    ],
  },
];

function MenuDropdown({
  menu,
  onClose,
  onRun,
}: {
  menu: MenuDefinition;
  onClose: () => void;
  onRun: (cmd: CommandId) => void;
}) {
  return (
    <motion.div
      role="menu"
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.14, ease: [0.25, 0, 0, 1] }}
      className="allow-shadow absolute left-0 top-full z-50 mt-1 min-w-[220px] origin-top rounded-soft border border-subtle bg-paper px-1 py-1"
      style={{ boxShadow: 'var(--shadow-popover)' }}
    >
      {menu.items.map((item, idx) =>
        item.kind === 'separator' ? (
          <div key={`sep-${idx}`} className="my-1 h-px bg-subtle" />
        ) : (
          <button
            key={item.command}
            type="button"
            onClick={() => { onClose(); onRun(item.command); }}
            className="flex w-full items-center justify-between gap-6 rounded-[5px] px-2 py-1.5 text-left text-[13px] text-text-primary transition-colors hover:bg-surface"
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[11px] text-muted">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </motion.div>
  );
}

export function AppMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpenId(null), []);

  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openId, closeMenu]);

  const runCommand = (command: CommandId): void => {
    void window.heartless.commands.execute(command);
  };

  return (
    <div ref={containerRef} className="no-drag flex items-center">
      {MENUS.map((menu) => {
        const isOpen = openId === menu.id;
        return (
          <div key={menu.id} className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpenId(isOpen ? null : menu.id);
              }}
              onMouseEnter={() => {
                if (openId && openId !== menu.id) setOpenId(menu.id);
              }}
              className={
                'flex h-7 items-center rounded-soft px-2 text-[12px] transition-colors ' +
                (isOpen
                  ? 'bg-surface text-text-primary'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary')
              }
            >
              {menu.label}
            </button>

            <AnimatePresence>
              {isOpen && (
                <MenuDropdown
                  key={menu.id}
                  menu={menu}
                  onClose={closeMenu}
                  onRun={runCommand}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
