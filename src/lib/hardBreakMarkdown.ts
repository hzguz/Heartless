import HardBreak from '@tiptap/extension-hard-break';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { MarkdownSerializerState } from '@tiptap/pm/markdown';

const PLAIN_BREAK = '\n';
// CommonMark hard break: survives where a bare newline would collapse into a
// blank line (and therefore a paragraph split) on the next parse.
const ESCAPED_BREAK = '\\\n';

/**
 * Markdown for the hard break at `index` inside `parent`, or `''` when it must
 * be dropped. Both parsers in this app (`tiptap-markdown` and the virtual
 * preview's `marked`) run with `breaks: true`, so an isolated break can be a
 * plain newline. Runs of breaks, and a break that opens a line, need the escaped
 * form: as bare newlines they would read back as a paragraph boundary.
 */
export function hardBreakMarkdown(parent: ProseMirrorNode, index: number): string {
  const node = parent.child(index);
  let hasContentAfter = false;
  for (let i = index + 1; i < parent.childCount; i++) {
    if (parent.child(i).type !== node.type) {
      hasContentAfter = true;
      break;
    }
  }
  // Trailing breaks carry no text and are dropped, matching tiptap-markdown.
  if (!hasContentAfter) return '';

  const previous = index > 0 ? parent.child(index - 1) : null;
  const next = parent.child(index + 1);
  const isIsolated = previous !== null && previous.type !== node.type && next.type !== node.type;
  return isIsolated ? PLAIN_BREAK : ESCAPED_BREAK;
}

export const MarkdownHardBreak = HardBreak.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, _node: ProseMirrorNode, parent: ProseMirrorNode, index: number) {
          const markdown = hardBreakMarkdown(parent, index);
          if (markdown) state.write(markdown);
        },
      },
    };
  },
});
