import { marked } from 'marked';

export type MarkdownBlockType =
  | 'blockquote'
  | 'code'
  | 'heading'
  | 'hr'
  | 'list'
  | 'paragraph'
  | 'table';

export interface MarkdownBlock {
  id: string;
  raw: string;
  type: MarkdownBlockType;
  estimatedHeight: number;
  preview: string;
  headingPath: string[];
  startLine: number;
  endLine: number;
  charStart: number;
  charEnd: number;
}

const renderer = {
  html(token: { raw?: string; text?: string }) {
    return escapeHtml(token.raw ?? token.text ?? '');
  },
  // Mirrors marked's default output but adds `data-lang`, which the stylesheet
  // renders as the badge in the code block's corner.
  code(token: { text?: string; lang?: string }) {
    const body = escapeHtml(token.text ?? '');
    const lang = (token.lang ?? '').trim().split(/\s+/)[0];
    if (!lang) return `<pre><code>${body}\n</code></pre>\n`;
    const safeLang = escapeHtml(lang);
    return `<pre><code class="language-${safeLang}" data-lang="${safeLang}">${body}\n</code></pre>\n`;
  },
};

marked.use({
  async: false,
  breaks: true,
  gfm: true,
  renderer,
});

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  let currentHeadingPath: string[] = [];

  const pushBlock = (rawLines: string[], type: MarkdownBlockType, startLine: number, endLine: number) => {
    const raw = rawLines.join('\n');
    if (!raw.trim()) return;
    const charStart = lineToCharOffset(lines, startLine);
    const charEnd = lineToCharOffset(lines, endLine + 1) - 1;
    if (type === 'heading') {
      const level = raw.match(/^#{1,6}/)?.[0].length ?? 1;
      const text = raw.replace(/^#{1,6}\s+/, '').trim();
      currentHeadingPath = [...currentHeadingPath.slice(0, level - 1), text];
    }
    blocks.push({
      id: `${blocks.length}:${type}:${startLine + 1}-${endLine + 1}`,
      raw,
      type,
      estimatedHeight: estimateBlockHeight(raw, type),
      preview: createPreview(raw),
      headingPath: [...currentHeadingPath],
      startLine,
      endLine,
      charStart,
      charEnd,
    });
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^```|^~~~/.test(line.trim())) {
      const fence = line.trim().slice(0, 3);
      const start = index;
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith(fence)) {
        index += 1;
      }
      if (index < lines.length) index += 1;
      pushBlock(lines.slice(start, index), 'code', start, index - 1);
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      pushBlock([line], 'heading', index, index);
      index += 1;
      continue;
    }

    if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(line.trim())) {
      pushBlock([line], 'hr', index, index);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const start = index;
      index += 2;
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        index += 1;
      }
      pushBlock(lines.slice(start, index), 'table', start, index - 1);
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const start = index;
      while (index < lines.length && (/^\s{0,3}>\s?/.test(lines[index]) || !lines[index].trim())) {
        index += 1;
      }
      pushBlock(lines.slice(start, index), 'blockquote', start, index - 1);
      continue;
    }

    if (isListLine(line)) {
      const start = index;
      while (index < lines.length && (isListLine(lines[index]) || isIndentedContinuation(lines[index]) || !lines[index].trim())) {
        index += 1;
      }
      pushBlock(lines.slice(start, index), 'list', start, index - 1);
      continue;
    }

    const start = index;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```|^~~~/.test(lines[index].trim()) &&
      !/^#{1,6}\s+/.test(lines[index]) &&
      !isListLine(lines[index]) &&
      !/^\s{0,3}>\s?/.test(lines[index]) &&
      !isTableStart(lines, index)
    ) {
      index += 1;
    }
    pushBlock(lines.slice(start, index), 'paragraph', start, index - 1);
  }

  return blocks;
}

export function renderMarkdownBlock(block: MarkdownBlock): string {
  return marked.parse(block.raw, { async: false }) as string;
}

function estimateBlockHeight(raw: string, type: MarkdownBlockType): number {
  const lineCount = Math.max(1, raw.split('\n').length);
  if (type === 'heading') return 56;
  if (type === 'hr') return 42;
  if (type === 'code') return 44 + lineCount * 22;
  if (type === 'table') return 52 + lineCount * 34;
  if (type === 'blockquote') return 28 + lineCount * 27;
  if (type === 'list') return 24 + lineCount * 28;
  return 20 + Math.ceil(raw.length / 92) * 28;
}

function isListLine(line: string): boolean {
  return /^\s{0,3}([-*+]|\d+[.)])\s+/.test(line);
}

function isIndentedContinuation(line: string): boolean {
  return /^\s{2,}\S/.test(line);
}

function isTableStart(lines: string[], index: number): boolean {
  const current = lines[index] ?? '';
  const next = lines[index + 1] ?? '';
  return /^\s*\|.*\|\s*$/.test(current) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(next);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPreview(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function lineToCharOffset(lines: string[], targetLine: number): number {
  if (targetLine <= 0) return 0;
  let offset = 0;
  for (let i = 0; i < targetLine && i < lines.length; i += 1) {
    offset += lines[i].length + 1;
  }
  return offset;
}
