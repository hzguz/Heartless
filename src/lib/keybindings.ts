import type { CommandId } from '@/types';

interface Binding {
  command: CommandId;
  key: string;
  shift?: boolean;
}

const BINDINGS: Binding[] = [
  { command: 'file:new-tab',    key: 'n' },
  { command: 'file:open',       key: 'o' },
  { command: 'file:save',       key: 's' },
  { command: 'file:save-as',    key: 's', shift: true },
  { command: 'file:export',     key: 'e' },
  { command: 'file:close-tab',  key: 'w' },
  { command: 'file:close-all-tabs', key: 'w', shift: true },
];

const isMac = navigator.platform.toLowerCase().includes('mac');

function matchesMod(event: KeyboardEvent): boolean {
  return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

export function registerGlobalShortcuts(): () => void {
  const handler = (event: KeyboardEvent): void => {
    if (!matchesMod(event)) return;
    if (event.altKey) return;
    const key = event.key.toLowerCase();
    for (const b of BINDINGS) {
      if (b.key !== key) continue;
      if (Boolean(b.shift) !== event.shiftKey) continue;
      event.preventDefault();
      event.stopPropagation();
      void window.heartless?.commands?.execute?.(b.command);
      return;
    }
  };
  window.addEventListener('keydown', handler, { capture: true });
  // The DOM lib types removeEventListener's third argument as boolean |
  // EventListenerOptions, which has no `capture` in older TS lib versions.
  return () => window.removeEventListener('keydown', handler, { capture: true } as EventListenerOptions);
}
