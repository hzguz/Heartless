import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * `tiptap-markdown` fills `editor.storage.markdown` during `onBeforeCreate`
 * with `{ options, parser, serializer, getMarkdown }`, but its published
 * declarations only describe `options` and `getMarkdown`. Rather than cast at
 * every call site, the untyped access is confined to this module.
 *
 * Members are optional on purpose: the storage does not exist until the
 * Markdown extension has initialised.
 */
interface MarkdownStorage {
  getMarkdown?: () => string;
  serializer?: { serialize: (content: ProseMirrorNode) => string };
}

function markdownStorage(editor: Editor): MarkdownStorage | undefined {
  return (editor.storage as Record<string, unknown>).markdown as MarkdownStorage | undefined;
}

/** Serialised document, or `fallback` when the extension isn't ready. */
export function getMarkdown(editor: Editor, fallback = ''): string {
  return markdownStorage(editor)?.getMarkdown?.() ?? fallback;
}

/**
 * Serialises an arbitrary node — used to turn the current selection into
 * Markdown. Returns null when the serializer isn't available so callers can
 * fall back to plain text.
 */
export function serializeNode(editor: Editor, node: ProseMirrorNode): string | null {
  const serialize = markdownStorage(editor)?.serializer?.serialize;
  if (!serialize) return null;
  return serialize(node);
}
