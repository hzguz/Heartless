import TaskList from '@tiptap/extension-task-list';

/**
 * tiptap-markdown only tracks list tightness for bullet and ordered lists, so a
 * task list typed tight in the raw textarea (`- [ ] a\n- [ ] b`) was re-saved
 * loose, with a blank line between items, as soon as the rich editor touched
 * the document. The task list reuses the bullet-list serializer, which reads
 * this same `tight` attribute; the parse rule mirrors `MarkdownTightLists`.
 */
export const TightTaskList = TaskList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tight: {
        default: true,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-tight') === 'true' || !element.querySelector('p'),
        renderHTML: (attributes: { tight?: boolean }) => ({
          'data-tight': attributes.tight ? 'true' : null,
        }),
      },
    };
  },
});
