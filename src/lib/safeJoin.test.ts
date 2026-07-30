/**
 * Mirrors safeJoin() from electron/fs-handlers.ts. That module lives in the
 * main-process compilation target, which Vitest does not load, so the rule is
 * duplicated here to lock in the traversal cases.
 *
 * Uses posix semantics for stable assertions across platforms; the real
 * implementation uses the platform `path`.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';

function safeJoin(parentPath: string, name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') return null;
  if (path.posix.isAbsolute(trimmed)) return null;

  const parent = path.posix.resolve(parentPath);
  const target = path.posix.resolve(parent, trimmed);
  if (target !== parent && !target.startsWith(parent + path.posix.sep)) return null;
  return target;
}

const PARENT = '/proj/src';

describe('safeJoin', () => {
  it('accepts an ordinary file name', () => {
    expect(safeJoin(PARENT, 'notes.md')).toBe('/proj/src/notes.md');
  });

  it('accepts a nested path inside the parent', () => {
    expect(safeJoin(PARENT, 'sub/notes.md')).toBe('/proj/src/sub/notes.md');
  });

  it('trims surrounding whitespace', () => {
    expect(safeJoin(PARENT, '  notes.md  ')).toBe('/proj/src/notes.md');
  });

  it('rejects climbing out of the parent', () => {
    expect(safeJoin(PARENT, '../escape.md')).toBeNull();
    expect(safeJoin(PARENT, '../../../../etc/passwd')).toBeNull();
    expect(safeJoin(PARENT, 'sub/../../escape.md')).toBeNull();
  });

  it('rejects an absolute path, which would discard the parent entirely', () => {
    expect(safeJoin(PARENT, '/etc/passwd')).toBeNull();
  });

  it('rejects empty and dot names', () => {
    expect(safeJoin(PARENT, '')).toBeNull();
    expect(safeJoin(PARENT, '   ')).toBeNull();
    expect(safeJoin(PARENT, '.')).toBeNull();
    expect(safeJoin(PARENT, '..')).toBeNull();
  });

  it('allows names that merely contain dots', () => {
    expect(safeJoin(PARENT, '..hidden.md')).toBe('/proj/src/..hidden.md');
    expect(safeJoin(PARENT, 'a..b.md')).toBe('/proj/src/a..b.md');
    expect(safeJoin(PARENT, '.gitignore')).toBe('/proj/src/.gitignore');
  });

  it('normalises a redundant but safe path', () => {
    expect(safeJoin(PARENT, 'sub/../notes.md')).toBe('/proj/src/notes.md');
  });
});
