import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { resolveEnterAction } from './smartEnter';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: { group: 'block', content: 'inline*' },
    codeBlock: { group: 'block', content: 'text*' },
    bulletList: { group: 'block', content: 'listItem+' },
    listItem: { content: 'paragraph+' },
    blockquote: { group: 'block', content: 'block+' },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
});

const text = (value: string) => schema.text(value);
const br = () => schema.nodes.hardBreak.create();
const paragraph = (...inline: ProseMirrorNode[]) => schema.nodes.paragraph.create(null, inline);

/** Cursor at the end of the first textblock of `block`. */
const cursorAtEndOf = (block: ProseMirrorNode) => {
  const doc = schema.nodes.doc.create(null, block);
  let end = 0;
  doc.descendants((node, pos) => {
    if (node.isTextblock && end === 0) end = pos + 1 + node.content.size;
    return end === 0;
  });
  return TextSelection.create(doc, end);
};

describe('resolveEnterAction', () => {
  it('inserts a line break after text', () => {
    expect(resolveEnterAction(cursorAtEndOf(paragraph(text('H'))))).toBe('lineBreak');
  });

  it('starts a paragraph when the previous Enter left a break before the cursor', () => {
    expect(resolveEnterAction(cursorAtEndOf(paragraph(text('H'), br())))).toBe('paragraph');
  });

  it('adds nothing on an empty line, since Markdown collapses extra blank lines', () => {
    expect(resolveEnterAction(cursorAtEndOf(paragraph()))).toBe('none');
  });

  it('leaves list items to their own Enter handling', () => {
    const list = schema.nodes.bulletList.create(null, schema.nodes.listItem.create(null, paragraph(text('a'))));
    expect(resolveEnterAction(cursorAtEndOf(list))).toBe('default');
  });

  it('leaves headings and code blocks to their own Enter handling', () => {
    expect(resolveEnterAction(cursorAtEndOf(schema.nodes.heading.create(null, text('T'))))).toBe('default');
    expect(resolveEnterAction(cursorAtEndOf(schema.nodes.codeBlock.create(null, text('x'))))).toBe('default');
  });

  it('applies inside blockquotes like in plain paragraphs', () => {
    const quote = schema.nodes.blockquote.create(null, paragraph(text('q')));
    expect(resolveEnterAction(cursorAtEndOf(quote))).toBe('lineBreak');
  });
});
