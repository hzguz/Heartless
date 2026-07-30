import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks, renderMarkdownBlock } from './markdownBlocks';

const types = (md: string) => parseMarkdownBlocks(md).map((b) => b.type);

describe('parseMarkdownBlocks', () => {
  it('returns nothing for empty or whitespace-only input', () => {
    expect(parseMarkdownBlocks('')).toEqual([]);
    expect(parseMarkdownBlocks('\n\n   \n')).toEqual([]);
  });

  it('classifies the basic block types', () => {
    expect(types('# Title')).toEqual(['heading']);
    expect(types('just a line')).toEqual(['paragraph']);
    expect(types('> quoted')).toEqual(['blockquote']);
    expect(types('- one\n- two')).toEqual(['list']);
    expect(types('1. one\n2. two')).toEqual(['list']);
    expect(types('---')).toEqual(['hr']);
  });

  it('keeps a fenced code block as one block, including its content', () => {
    const blocks = parseMarkdownBlocks('```js\nconst a = 1;\n\nconst b = 2;\n```');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    // The blank line inside the fence must not split the block.
    expect(blocks[0].raw).toContain('const b = 2;');
  });

  it('supports tilde fences', () => {
    expect(types('~~~\ncode\n~~~')).toEqual(['code']);
  });

  it('does not treat headings inside a fence as headings', () => {
    expect(types('```\n# not a heading\n```')).toEqual(['code']);
  });

  it('parses a GFM table', () => {
    const md = '| a | b |\n| --- | --- |\n| 1 | 2 |';
    expect(types(md)).toEqual(['table']);
  });

  it('needs a delimiter row to count as a table', () => {
    expect(types('| a | b |\nnot a delimiter')).toEqual(['paragraph']);
  });

  it('splits consecutive blocks and preserves order', () => {
    const md = '# Title\n\nIntro text\n\n- a\n- b\n\n```ts\nx\n```\n\n> note';
    expect(types(md)).toEqual(['heading', 'paragraph', 'list', 'code', 'blockquote']);
  });

  it('tracks the heading path so nested sections are attributable', () => {
    const blocks = parseMarkdownBlocks('# One\n\ntext a\n\n## Two\n\ntext b');
    const paragraphs = blocks.filter((b) => b.type === 'paragraph');
    expect(paragraphs[0].headingPath).toEqual(['One']);
    expect(paragraphs[1].headingPath).toEqual(['One', 'Two']);
  });

  it('records line ranges that map back to the source', () => {
    const md = '# Title\n\nparagraph one\n\nparagraph two';
    const blocks = parseMarkdownBlocks(md);
    const lines = md.split('\n');
    for (const b of blocks) {
      expect(lines[b.startLine]).toBeDefined();
      expect(b.endLine).toBeGreaterThanOrEqual(b.startLine);
    }
    expect(blocks[0].startLine).toBe(0);
  });

  it('records char offsets that slice the original text', () => {
    const md = '# Title\n\nsome paragraph';
    const blocks = parseMarkdownBlocks(md);
    expect(md.slice(blocks[0].charStart, blocks[0].charEnd)).toContain('# Title');
  });

  it('normalises CRLF so Windows files parse identically', () => {
    expect(types('# Title\r\n\r\ntext')).toEqual(['heading', 'paragraph']);
  });

  it('gives every block a unique id and a positive estimated height', () => {
    const blocks = parseMarkdownBlocks('# A\n\ntext\n\n- x\n\n```\ny\n```');
    expect(new Set(blocks.map((b) => b.id)).size).toBe(blocks.length);
    expect(blocks.every((b) => b.estimatedHeight > 0)).toBe(true);
  });
});

describe('renderMarkdownBlock', () => {
  it('renders inline markdown to HTML', () => {
    const [block] = parseMarkdownBlocks('**bold** and `code`');
    const html = renderMarkdownBlock(block);
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
  });

  it('emits data-lang for a fenced block so the badge has a label', () => {
    const [block] = parseMarkdownBlocks('```ts\nlet x = 1;\n```');
    const html = renderMarkdownBlock(block);
    expect(html).toContain('data-lang="ts"');
    expect(html).toContain('class="language-ts"');
  });

  it('omits data-lang when the fence has no language', () => {
    const [block] = parseMarkdownBlocks('```\nplain\n```');
    expect(renderMarkdownBlock(block)).not.toContain('data-lang');
  });

  // The preview injects this HTML with dangerouslySetInnerHTML.
  it('escapes HTML inside a code fence', () => {
    const [block] = parseMarkdownBlocks('```js\n<script>alert(1)</script>\n```');
    const html = renderMarkdownBlock(block);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('escapes a hostile fence language', () => {
    const [block] = parseMarkdownBlocks('```<img src=x onerror=alert(1)>\nboom\n```');
    const html = renderMarkdownBlock(block);
    expect(html).not.toContain('<img');
  });

  it('escapes raw HTML written directly in the document', () => {
    const blocks = parseMarkdownBlocks('<script>alert(1)</script>');
    const html = blocks.map(renderMarkdownBlock).join('');
    expect(html).not.toContain('<script>');
  });
});
