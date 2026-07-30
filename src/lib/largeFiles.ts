import type { OpenedFile } from '@/types';

export const LARGE_DOC_BYTES = 128 * 1024;
export const LARGE_DOC_CHARS = 80_000;
export const LARGE_DOC_LINES = 4000;

export function isLargeContent(content: string): boolean {
  return content.length >= LARGE_DOC_CHARS;
}

export function isLargeOpenedFile(file: OpenedFile): boolean {
  return (
    file.sizeBytes >= LARGE_DOC_BYTES ||
    file.lineCount >= LARGE_DOC_LINES ||
    isLargeContent(file.content)
  );
}
