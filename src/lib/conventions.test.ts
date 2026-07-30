/**
 * Guard-rails for project conventions that are easy to regress and invisible in
 * review. These assert project conventions rather than behaviour.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p: string) => path.relative(ROOT, p).replace(/\\/g, '/');

describe('theme tokens', () => {
  // Colours must come from CSS variables so the runtime colour editor can
  // override them. A literal hex freezes at the default and breaks custom themes.
  const EXEMPT = [
    // Fixed syntax-highlighting schemes (VSCode Dark+ / GitHub Light).
    'src/components/CodeWorkspace.tsx',
    // Per-filetype identity colours, not theme colours.
    'src/lib/fileIcons.ts',
    'src/components/FileExplorerSidebar.tsx',
    // The editor itself displays and writes literal hex values.
    'src/components/ThemeEditor.tsx',
  ];

  it('globals.css declares colours only inside theme blocks', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/styles/globals.css'), 'utf8');
    const offenders = css
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line))
      // Token definitions and the shadow token are the source of truth.
      .filter(({ line }) => !/^--color-|^--shadow-popover:/.test(line))
      .map(({ line, n }) => `globals.css:${n}  ${line}`);

    expect(offenders).toEqual([]);
  });

  it('components use tokens rather than literal colours', () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(ROOT, 'src'))) {
      if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const r = rel(file);
      if (EXEMPT.includes(r)) continue;
      const src = fs.readFileSync(file, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (/#[0-9a-fA-F]{6}\b|rgba?\(\s*\d/.test(line)) offenders.push(`${r}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('i18n dictionaries', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/i18n.ts'), 'utf8');
  const langs = ['en', 'pt', 'ja'] as const;

  const keysFor = (lang: string): string[] => {
    const start = src.indexOf(`  ${lang}: {`);
    const nextLang = langs[langs.indexOf(lang as typeof langs[number]) + 1];
    const end = nextLang ? src.indexOf(`  ${nextLang}: {`) : src.indexOf('} as const');
    const block = src.slice(start, end < 0 ? undefined : end);
    return [...block.matchAll(/'([a-z][a-zA-Z]*(?:\.[a-zA-Z]+)*)':/g)].map((m) => m[1]);
  };

  const en = keysFor('en');

  it('has keys in en', () => {
    expect(en.length).toBeGreaterThan(0);
  });

  it.each(['pt', 'ja'])('%s covers every en key with no extras', (lang) => {
    const keys = keysFor(lang);
    expect(en.filter((k) => !keys.includes(k))).toEqual([]);
    expect(keys.filter((k) => !en.includes(k))).toEqual([]);
  });

  it('defines no key that is never used through t()', () => {
    const used = new Set<string>();
    for (const file of walk(path.join(ROOT, 'src'))) {
      if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/\bt\(\s*'([a-z][a-zA-Z]*(?:\.[a-zA-Z]+)+)'\s*\)/g)) {
        used.add(m[1]);
      }
    }
    expect(en.filter((k) => !used.has(k))).toEqual([]);
  });
});

describe('IPC protocol duplication', () => {
  // CommandId is declared in both compilation targets because src/ and
  // electron/ cannot import from each other. Drift is invisible to both
  // compilers and only shows up as a menu item that silently does nothing.
  const union = (file: string, name: string): string[] => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const start = src.indexOf(`type ${name} =`);
    if (start < 0) return [];
    const end = src.indexOf(';', start);
    return [...src.slice(start, end).matchAll(/'([a-z:-]+)'/g)].map((m) => m[1]).sort();
  };

  it('CommandId matches across electron/ and src/', () => {
    const inElectron = union('electron/menu.ts', 'CommandId');
    const inRenderer = union('src/types/index.ts', 'CommandId');
    expect(inElectron.length).toBeGreaterThan(0);
    expect(inRenderer).toEqual(inElectron);
  });

  it('every menu channel is allow-listed in the preload bridge', () => {
    const channels = union('src/types/index.ts', 'MenuChannel');
    const preload = fs.readFileSync(path.join(ROOT, 'electron/preload.ts'), 'utf8');
    // An unlisted channel is dropped silently by menu.on().
    expect(channels.filter((c) => !preload.includes(`'${c}'`))).toEqual([]);
  });
});
