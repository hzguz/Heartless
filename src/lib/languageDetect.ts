import type { LanguageSupport } from '@codemirror/language';
import type { PreviewType } from '@/types';

const MD_EXTS = new Set(['.md', '.markdown', '.txt']);

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
const PDF_EXTS = new Set(['.pdf']);
// .docx only — mammoth cannot read the legacy .doc binary format, so routing
// it to the Word preview would always fail. Keep in sync with fs-handlers.ts.
const WORD_EXTS = new Set(['.docx']);

/**
 * Lowercased extension including the leading dot, or '' when the path has none.
 * Guarding on the dot matters: `slice(lastIndexOf('.'))` returns the last
 * character rather than '' for extensionless paths like `README`.
 */
export function extOf(filePath: string): string {
  const dot = filePath.lastIndexOf('.');
  return dot < 0 ? '' : filePath.slice(dot).toLowerCase();
}

/**
 * Previewable formats that are also editable text. SVG is markup, so the user
 * can flip between the rendered image and its source; PNG/PDF/DOCX have no
 * text representation and stay preview-only.
 */
const EDITABLE_PREVIEW_EXTS = new Set(['.svg']);

export function isEditablePreview(filePath: string): boolean {
  return EDITABLE_PREVIEW_EXTS.has(extOf(filePath));
}

/** Files rendered in a preview pane instead of a text editor. */
export function getPreviewType(filePath: string): PreviewType | null {
  const ext = extOf(filePath);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (PDF_EXTS.has(ext)) return 'pdf';
  if (WORD_EXTS.has(ext)) return 'word';
  return null;
}

export function isCodeFile(filePath: string): boolean {
  const ext = extOf(filePath);
  return !MD_EXTS.has(ext) && ext.length > 1;
}

export function detectLanguage(filePath: string): { label: string; support: LanguageSupport | null } {
  const ext = extOf(filePath);

  switch (ext) {
    case '.html':
    case '.htm':
      return { label: 'HTML', support: null };
    case '.css':
      return { label: 'CSS', support: null };
    case '.scss':
      return { label: 'SCSS', support: null };
    case '.js':
    case '.mjs':
    case '.cjs':
      return { label: 'JavaScript', support: null };
    case '.jsx':
      return { label: 'JSX', support: null };
    case '.ts':
      return { label: 'TypeScript', support: null };
    case '.tsx':
      return { label: 'TSX', support: null };
    case '.json':
      return { label: 'JSON', support: null };
    case '.php':
      return { label: 'PHP', support: null };
    case '.xml':
    case '.svg':
      return { label: 'XML', support: null };
    case '.yaml':
    case '.yml':
      return { label: 'YAML', support: null };
    case '.py':
      return { label: 'Python', support: null };
    case '.rs':
      return { label: 'Rust', support: null };
    case '.go':
      return { label: 'Go', support: null };
    case '.java':
      return { label: 'Java', support: null };
    case '.sh':
    case '.bash':
      return { label: 'Shell', support: null };
    case '.toml':
      return { label: 'TOML', support: null };
    default:
      return { label: ext.slice(1).toUpperCase() || 'Text', support: null };
  }
}

// Async loader — imports language packs lazily to keep initial bundle small
export async function loadLanguageSupport(filePath: string): Promise<LanguageSupport | null> {
  const ext = extOf(filePath);
  switch (ext) {
    case '.html':
    case '.htm': {
      const { html } = await import('@codemirror/lang-html');
      return html();
    }
    case '.css':
    case '.scss': {
      const { css } = await import('@codemirror/lang-css');
      return css();
    }
    case '.js':
    case '.mjs':
    case '.cjs':
    case '.jsx': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ jsx: ext === '.jsx' });
    }
    case '.ts':
    case '.tsx': {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true, jsx: ext === '.tsx' });
    }
    case '.json': {
      const { json } = await import('@codemirror/lang-json');
      return json();
    }
    case '.php': {
      const { php } = await import('@codemirror/lang-php');
      return php();
    }
    case '.xml':
    case '.svg': {
      const { xml } = await import('@codemirror/lang-xml');
      return xml();
    }
    case '.md':
    case '.markdown': {
      const { markdown } = await import('@codemirror/lang-markdown');
      return markdown();
    }
    default:
      return null;
  }
}
