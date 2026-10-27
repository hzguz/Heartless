import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Selection } from '@tiptap/pm/state';

/**
 * Enter in the rich editor must mean exactly what a newline means in the raw
 * Markdown textarea, so the two surfaces never disagree:
 *  - first Enter  → hard break   (`\n`, rendered as the next line)
 *  - second Enter → new paragraph (`\n\n`, rendered with a blank-line gap)
 *  - further Enters on the empty line → nothing: Markdown collapses runs of
 *    blank lines, so a second blank line could only be stored as `\` escapes.
 * Shift+Enter follows the same rules — in the textarea it is a plain newline too.
 */
export type EnterAction = 'default' | 'lineBreak' | 'paragraph' | 'none';

const PARAGRAPH = 'paragraph';
const HARD_BREAK = 'hardBreak';
// These own their Enter semantics (new list item, newline in code, leave heading).
const BLOCKS_WITH_NATIVE_ENTER = new Set(['codeBlock', 'heading', 'listItem', 'taskItem']);

// Must outrank Tiptap's core keymap and the HardBreak extension (both 100);
// otherwise their Enter handlers run first and this never fires.
const SMART_ENTER_PRIORITY = 101;

export function resolveEnterAction(selection: Selection): EnterAction {
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if (BLOCKS_WITH_NATIVE_ENTER.has($from.node(depth).type.name)) return 'default';
  }
  if ($from.parent.type.name !== PARAGRAPH) return 'default';
  if (selection.empty && $from.parent.content.size === 0) return 'none';
  if (selection.empty && $from.nodeBefore?.type.name === HARD_BREAK) return 'paragraph';
  return 'lineBreak';
}

function runEnter({ editor }: { editor: Editor }): boolean {
  const action = resolveEnterAction(editor.state.selection);
  if (action === 'none') return true; // swallow the key: there is nothing to add
  if (action === 'lineBreak') return editor.commands.setHardBreak();
  if (action === 'paragraph') {
    // The break typed by the previous Enter becomes the paragraph boundary.
    const { from } = editor.state.selection;
    return editor
      .chain()
      .deleteRange({ from: from - 1, to: from })
      .splitBlock()
      .run();
  }
  return false;
}

export const SmartEnter = Extension.create({
  name: 'smartEnter',
  priority: SMART_ENTER_PRIORITY,

  addKeyboardShortcuts() {
    return {
      Enter: runEnter,
      'Shift-Enter': runEnter,
    };
  },
});
