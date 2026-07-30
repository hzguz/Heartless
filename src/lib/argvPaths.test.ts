/**
 * The argv-parsing rule used by electron/main.ts to find files the OS handed
 * us. It lives in the main process (which Vitest does not load), so the logic
 * is mirrored here to lock in the edge cases: Chromium switches, the dev-mode
 * ".", and the differing argv[0] between packaged and unpackaged runs.
 */
import { describe, expect, it } from 'vitest';

function filePathsFromArgv(
  argv: string[],
  isPackaged: boolean,
  exists: (p: string) => boolean,
): string[] {
  return argv
    .slice(isPackaged ? 1 : 2)
    .filter((arg) => !arg.startsWith('-') && arg !== '.')
    .filter(exists);
}

const existing = new Set([
  'C:\\Users\\me\\notes.md',
  'C:\\Users\\me\\a file.txt',
  '/Users/me/notes.md',
]);
const exists = (p: string) => existing.has(p);

describe('filePathsFromArgv', () => {
  it('finds the file in a packaged double-click launch', () => {
    const argv = ['C:\\Program Files\\Heartless\\Heartless.exe', 'C:\\Users\\me\\notes.md'];
    expect(filePathsFromArgv(argv, true, exists)).toEqual(['C:\\Users\\me\\notes.md']);
  });

  it('skips electron and the dot in a dev launch', () => {
    const argv = ['electron.exe', '.', '/Users/me/notes.md'];
    expect(filePathsFromArgv(argv, false, exists)).toEqual(['/Users/me/notes.md']);
  });

  it('ignores Chromium switches', () => {
    const argv = [
      'Heartless.exe',
      '--allow-file-access-from-files',
      '--disable-gpu',
      'C:\\Users\\me\\notes.md',
    ];
    expect(filePathsFromArgv(argv, true, exists)).toEqual(['C:\\Users\\me\\notes.md']);
  });

  it('keeps paths containing spaces', () => {
    const argv = ['Heartless.exe', 'C:\\Users\\me\\a file.txt'];
    expect(filePathsFromArgv(argv, true, exists)).toEqual(['C:\\Users\\me\\a file.txt']);
  });

  it('drops paths that no longer exist', () => {
    const argv = ['Heartless.exe', 'C:\\Users\\me\\deleted.md'];
    expect(filePathsFromArgv(argv, true, exists)).toEqual([]);
  });

  it('returns nothing for a plain launch with no file', () => {
    expect(filePathsFromArgv(['Heartless.exe'], true, exists)).toEqual([]);
    expect(filePathsFromArgv(['electron.exe', '.'], false, exists)).toEqual([]);
  });

  it('handles multiple files selected at once', () => {
    const argv = ['Heartless.exe', 'C:\\Users\\me\\notes.md', 'C:\\Users\\me\\a file.txt'];
    expect(filePathsFromArgv(argv, true, exists)).toEqual([
      'C:\\Users\\me\\notes.md',
      'C:\\Users\\me\\a file.txt',
    ]);
  });
});
