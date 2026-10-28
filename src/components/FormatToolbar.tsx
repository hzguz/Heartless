import { useState, useRef } from 'react';
import { useTabsStore } from '@/state/tabsStore';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Link as LinkIcon,
  Quote,
  Minus,
} from 'lucide-react';

interface Props {
  editor: Editor | null;
}

interface BtnProps {
  onMouseDown: (e: React.MouseEvent) => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function TBtn({ onMouseDown, active, title, children }: BtnProps) {
  return (
    <button
      onMouseDown={onMouseDown}
      title={title}
      aria-label={title}
      className={
        'flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors ' +
        (active
          ? 'text-accent accent-tint-active'
          : 'text-text-secondary hover:text-accent accent-tint-hover')
      }
    >
      {children}
    </button>
  );
}

export function FormatToolbar({ editor }: Props) {
  const isCode = useTabsStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.viewMode === 'code');
  const disabled = !editor;
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  if (isCode) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>): boolean => {
    if (!editor) return false;
    try { return editor.isActive(name, attrs); } catch { return false; }
  };

  const cmd = (fn: (e: Editor) => void) => (ev: React.MouseEvent) => {
    ev.preventDefault();
    if (!editor) return;
    fn(editor);
  };

  const openLink = (ev: React.MouseEvent) => {
    ev.preventDefault();
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    setLinkValue(prev ?? '');
    setLinkOpen(true);
    setTimeout(() => { linkInputRef.current?.focus(); linkInputRef.current?.select(); }, 0);
  };

  const commitLink = () => {
    if (!editor) return;
    const url = linkValue.trim();
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
    setLinkOpen(false);
    setLinkValue('');
  };

  const cancelLink = () => { setLinkOpen(false); setLinkValue(''); };

  return (
    <div className="flex h-7 items-center gap-1">
      <div className={`flex h-7 items-center gap-1${disabled ? ' pointer-events-none opacity-40' : ''}`}>
        <TBtn title="Heading 1" active={isActive('heading', { level: 1 })} onMouseDown={cmd((e) => e.chain().toggleHeading({ level: 1 }).run())}><Heading1 size={14} /></TBtn>
        <TBtn title="Heading 2" active={isActive('heading', { level: 2 })} onMouseDown={cmd((e) => e.chain().toggleHeading({ level: 2 }).run())}><Heading2 size={14} /></TBtn>
        <TBtn title="Heading 3" active={isActive('heading', { level: 3 })} onMouseDown={cmd((e) => e.chain().toggleHeading({ level: 3 }).run())}><Heading3 size={14} /></TBtn>
        <span className="mx-1 h-4 w-px bg-subtle" />
        <TBtn title="Bold" active={isActive('bold')} onMouseDown={cmd((e) => e.chain().toggleBold().run())}><Bold size={14} /></TBtn>
        <TBtn title="Italic" active={isActive('italic')} onMouseDown={cmd((e) => e.chain().toggleItalic().run())}><Italic size={14} /></TBtn>
        <TBtn title="Strikethrough" active={isActive('strike')} onMouseDown={cmd((e) => e.chain().toggleStrike().run())}><Strikethrough size={14} /></TBtn>
        <span className="mx-1 h-4 w-px bg-subtle" />
        <TBtn title="Bullet list" active={isActive('bulletList')} onMouseDown={cmd((e) => e.chain().toggleBulletList().run())}><List size={14} /></TBtn>
        <TBtn title="Ordered list" active={isActive('orderedList')} onMouseDown={cmd((e) => e.chain().toggleOrderedList().run())}><ListOrdered size={14} /></TBtn>
        <TBtn title="Checklist" active={isActive('taskList')} onMouseDown={cmd((e) => e.chain().toggleTaskList().run())}><CheckSquare size={14} /></TBtn>
        <span className="mx-1 h-4 w-px bg-subtle" />
        <TBtn title="Code block" active={isActive('codeBlock')} onMouseDown={cmd((e) => e.chain().toggleCodeBlock().run())}><Code2 size={14} /></TBtn>
      </div>

      <div className={`relative${disabled ? ' pointer-events-none opacity-40' : ''}`}>
        <TBtn title="Link" active={isActive('link') || linkOpen} onMouseDown={openLink}><LinkIcon size={14} /></TBtn>
        {linkOpen && (
          <div
            className="allow-shadow absolute left-1/2 top-[calc(100%+6px)] z-50 -translate-x-1/2 rounded-[10px] border border-subtle bg-paper p-1"
            style={{ boxShadow: 'var(--shadow-popover)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={linkInputRef}
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitLink(); }
                if (e.key === 'Escape') { e.preventDefault(); cancelLink(); }
                e.stopPropagation();
              }}
              onBlur={commitLink}
              placeholder="https://"
              className="w-56 bg-transparent px-2 py-1 text-[12px] text-text-primary outline-none"
            />
          </div>
        )}
      </div>
      <div className={disabled ? 'pointer-events-none opacity-40 flex h-7 items-center gap-1' : 'flex h-7 items-center gap-1'}>
        <TBtn title="Quote" active={isActive('blockquote')} onMouseDown={cmd((e) => e.chain().toggleBlockquote().run())}><Quote size={14} /></TBtn>
        <TBtn title="Horizontal rule" onMouseDown={cmd((e) => e.chain().setHorizontalRule().run())}><Minus size={14} /></TBtn>
      </div>
    </div>
  );
}
