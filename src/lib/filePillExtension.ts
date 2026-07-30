import { Node, mergeAttributes } from '@tiptap/core';
// Routed through @tiptap/pm (a declared dependency) rather than importing
// prosemirror-markdown directly, which is only present transitively.
import type { MarkdownSerializerState } from '@tiptap/pm/markdown';

export interface FilePillOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    filePill: {
      insertFilePill: (attrs: { path: string; name: string; ext: string }) => ReturnType;
    };
  }
}

export const FilePill = Node.create<FilePillOptions>({
  name: 'filePill',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      path: { default: null, parseHTML: (el) => el.getAttribute('href') ?? el.getAttribute('data-path') },
      name: { default: null, parseHTML: (el) => el.textContent ?? el.getAttribute('data-name') },
      ext:  { default: null, parseHTML: (el) => {
        const p = el.getAttribute('href') ?? el.getAttribute('data-path') ?? '';
        return p.includes('.') ? p.slice(p.lastIndexOf('.')) : el.getAttribute('data-ext');
      }},
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-file-pill]' },
      {
        tag: 'a[href]',
        getAttrs: (el) => {
          const href = (el as HTMLElement).getAttribute('href') ?? '';
          // Only treat as pill if href looks like a file path (has extension, not a URL)
          const isFilePath = /\.[a-zA-Z0-9]+$/.test(href) && !/^https?:\/\//.test(href);
          if (!isFilePath) return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-file-pill': '' })];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: { attrs: { path: string; name: string; ext: string } }) {
          const { path, name } = node.attrs;
          state.write(`[${name}](${path})`);
        },
        parse: {},
      },
    };
  },

  addCommands() {
    return {
      insertFilePill: (attrs) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs });
      },
    };
  },
});
