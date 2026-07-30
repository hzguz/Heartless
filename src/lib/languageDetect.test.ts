import { describe, expect, it } from 'vitest';
import {
  extOf,
  getPreviewType,
  isCodeFile,
  isEditablePreview,
  detectLanguage,
} from './languageDetect';

describe('extOf', () => {
  it('returns the lowercased extension with its dot', () => {
    expect(extOf('a.PNG')).toBe('.png');
    expect(extOf('/tmp/notes.md')).toBe('.md');
    expect(extOf('C:\\proj\\App.TSX')).toBe('.tsx');
  });

  it('returns empty string for paths with no extension', () => {
    // The reason this helper exists: `slice(lastIndexOf('.'))` returns the last
    // *character* when there is no dot, which silently matched the wrong set.
    expect(extOf('README')).toBe('');
    expect(extOf('Makefile')).toBe('');
    expect(extOf('')).toBe('');
  });

  it('treats a leading-dot file as an extension, matching prior behaviour', () => {
    expect(extOf('.gitignore')).toBe('.gitignore');
  });

  it('uses only the final extension', () => {
    expect(extOf('archive.tar.gz')).toBe('.gz');
  });
});

describe('getPreviewType', () => {
  it('classifies images', () => {
    for (const p of ['a.png', 'a.jpg', 'a.jpeg', 'a.gif', 'a.webp', 'a.svg', 'a.bmp', 'a.ico']) {
      expect(getPreviewType(p)).toBe('image');
    }
  });

  it('classifies pdf and docx', () => {
    expect(getPreviewType('a.pdf')).toBe('pdf');
    expect(getPreviewType('a.docx')).toBe('word');
  });

  it('does not claim legacy .doc, which mammoth cannot read', () => {
    expect(getPreviewType('a.doc')).toBeNull();
  });

  it('returns null for text and unknown files', () => {
    expect(getPreviewType('a.md')).toBeNull();
    expect(getPreviewType('a.ts')).toBeNull();
    expect(getPreviewType('README')).toBeNull();
  });
});

describe('isEditablePreview', () => {
  it('is true only for SVG, the one previewable format that is also markup', () => {
    expect(isEditablePreview('logo.svg')).toBe(true);
    expect(isEditablePreview('logo.SVG')).toBe(true);
    expect(isEditablePreview('photo.png')).toBe(false);
    expect(isEditablePreview('doc.pdf')).toBe(false);
    expect(isEditablePreview('report.docx')).toBe(false);
  });
});

describe('isCodeFile', () => {
  it('excludes markdown and plain text', () => {
    expect(isCodeFile('a.md')).toBe(false);
    expect(isCodeFile('a.markdown')).toBe(false);
    expect(isCodeFile('a.txt')).toBe(false);
  });

  it('includes anything else that has an extension', () => {
    expect(isCodeFile('a.ts')).toBe(true);
    expect(isCodeFile('a.py')).toBe(true);
    expect(isCodeFile('a.json')).toBe(true);
  });

  it('excludes extensionless files', () => {
    expect(isCodeFile('Makefile')).toBe(false);
    expect(isCodeFile('README')).toBe(false);
  });
});

describe('detectLanguage', () => {
  it('maps known extensions to display labels', () => {
    expect(detectLanguage('a.ts').label).toBe('TypeScript');
    expect(detectLanguage('a.tsx').label).toBe('TSX');
    expect(detectLanguage('a.py').label).toBe('Python');
    expect(detectLanguage('a.rs').label).toBe('Rust');
    expect(detectLanguage('a.yml').label).toBe('YAML');
  });

  it('falls back to the uppercased extension', () => {
    expect(detectLanguage('a.zig').label).toBe('ZIG');
  });

  it('labels extensionless files as Text rather than leaking a stray character', () => {
    expect(detectLanguage('Makefile').label).toBe('Text');
  });
});
