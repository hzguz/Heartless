import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { hardBreakMarkdown } from './hardBreakMarkdown';

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'inline*' },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
});

/** Builds a paragraph from a compact spec: `|` is a hard break, anything else is text. */
const paragraph = (...parts: string[]): ProseMirrorNode =>
  schema.nodes.paragraph.create(
    null,
    parts.map((part) => (part === '|' ? schema.nodes.hardBreak.create() : schema.text(part))),
  );

/** Markdown emitted for every hard break in the paragraph, in order. */
const breaksOf = (node: ProseMirrorNode): string[] => {
  const result: string[] = [];
  node.forEach((child, _offset, index) => {
    if (child.type.name === 'hardBreak') result.push(hardBreakMarkdown(node, index));
  });
  return result;
};

describe('hardBreakMarkdown', () => {
  it('writes an isolated break as a plain newline', () => {
    expect(breaksOf(paragraph('H', '|', 'B'))).toEqual(['\n']);
  });

  it('escapes consecutive breaks so the blank line survives a re-parse', () => {
    expect(breaksOf(paragraph('H', '|', '|', 'B'))).toEqual(['\\\n', '\\\n']);
  });

  it('escapes a break that opens the paragraph', () => {
    expect(breaksOf(paragraph('|', 'B'))).toEqual(['\\\n']);
  });

  it('drops trailing breaks', () => {
    expect(breaksOf(paragraph('H', '|', '|'))).toEqual(['', '']);
  });
});
