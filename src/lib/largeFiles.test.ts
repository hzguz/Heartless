import { describe, expect, it } from 'vitest';
import {
  LARGE_DOC_BYTES,
  LARGE_DOC_CHARS,
  LARGE_DOC_LINES,
  isLargeContent,
  isLargeOpenedFile,
} from './largeFiles';

const file = (over: Partial<Parameters<typeof isLargeOpenedFile>[0]> = {}) => ({
  filePath: '/a.md',
  content: '',
  sizeBytes: 0,
  lineCount: 0,
  ...over,
});

describe('isLargeContent', () => {
  it('is false below the char threshold and true at it', () => {
    expect(isLargeContent('x'.repeat(LARGE_DOC_CHARS - 1))).toBe(false);
    expect(isLargeContent('x'.repeat(LARGE_DOC_CHARS))).toBe(true);
  });

  it('treats empty content as small', () => {
    expect(isLargeContent('')).toBe(false);
  });
});

describe('isLargeOpenedFile', () => {
  it('is false for a small file on every axis', () => {
    expect(isLargeOpenedFile(file({ content: 'hello', sizeBytes: 5, lineCount: 1 }))).toBe(false);
  });

  it('triggers on byte size alone', () => {
    expect(isLargeOpenedFile(file({ sizeBytes: LARGE_DOC_BYTES }))).toBe(true);
  });

  it('triggers on line count alone — a wide-but-short file stays small', () => {
    expect(isLargeOpenedFile(file({ lineCount: LARGE_DOC_LINES }))).toBe(true);
    expect(isLargeOpenedFile(file({ lineCount: LARGE_DOC_LINES - 1 }))).toBe(false);
  });

  it('triggers on char count alone, e.g. a minified single line', () => {
    expect(isLargeOpenedFile(file({ content: 'x'.repeat(LARGE_DOC_CHARS) }))).toBe(true);
  });
});
