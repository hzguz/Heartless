import { useEffect, useRef, useState } from 'react';
import type { Tab } from '@/types';

interface Props {
  tab: Tab;
}

export function PreviewWorkspace({ tab }: Props) {
  // `revision` is part of the key so an SVG edited in source mode re-reads from
  // disk when it comes back to preview, instead of showing the cached render.
  if (tab.previewType === 'image') {
    return <ImagePreview key={`${tab.filePath}:${tab.revision}`} filePath={tab.filePath!} />;
  }
  if (tab.previewType === 'pdf') return <PdfPreview filePath={tab.filePath!} />;
  if (tab.previewType === 'word') return <WordPreview filePath={tab.filePath!} />;
  return null;
}

// ---------------------------------------------------------------------------

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
  ico: 'image/x-icon', svg: 'image/svg+xml',
};

function ImagePreview({ filePath }: { filePath: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset per path so a previous failure doesn't stick when the tab reloads.
    setSrc(null);
    setError(null);
    const ext = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'image/png';
    window.heartless.files.readBase64(filePath).then(
      (b64) => {
        if (cancelled) return;
        // null means the file is gone or unreadable — without this the
        // spinner would run forever.
        if (b64) setSrc(`data:${mime};base64,${b64}`);
        else setError('Could not read this image.');
      },
      () => { if (!cancelled) setError('Could not read this image.'); },
    );
    return () => { cancelled = true; };
  }, [filePath]);

  if (error) return <PreviewError message={error} />;
  if (!src) return <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-surface p-4">
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full select-none rounded object-contain shadow-sm"
        draggable={false}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PdfPreview({ filePath }: { filePath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Reset per path, otherwise a previous error state persists when the same
    // tab points at a different file (e.g. after Save As).
    setError(null);
    setLoading(true);

    async function render() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url,
        ).toString();

        const b64 = await window.heartless.files.readBase64(filePath);
        if (!b64 || cancelled) return;
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const devicePixelRatio = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 * devicePixelRatio });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / devicePixelRatio}px`;
          canvas.style.height = `${viewport.height / devicePixelRatio}px`;
          canvas.className = 'mb-3 block rounded shadow-sm';

          container.appendChild(canvas);

          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
          // pdfjs type definitions have an internal mismatch — cast required
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await page.render({ canvasContext: ctx, viewport } as any).promise;
        }

        setLoading(false);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    render();
    return () => { cancelled = true; };
  }, [filePath]);

  if (error) return <PreviewError message={error} />;

  return (
    <div className="relative h-full w-full overflow-auto bg-surface p-6">
      {loading && <LoadingSpinner />}
      <div ref={containerRef} className="mx-auto w-fit" />
    </div>
  );
}

// ---------------------------------------------------------------------------

function WordPreview({ filePath }: { filePath: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.heartless.files.docxToHtml(filePath).then((result) => {
      if (cancelled) return;
      if (result === null) setError('Could not convert document.');
      else setHtml(result);
    });
    return () => { cancelled = true; };
  }, [filePath]);

  if (error) return <PreviewError message={error} />;
  if (html === null) return <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="h-full w-full overflow-auto bg-paper px-12 py-10">
      <div
        className="prose prose-sm mx-auto max-w-[720px] text-text-primary"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex h-full min-h-[120px] w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-subtle border-t-accent" />
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8 text-center text-sm text-muted">
      {message}
    </div>
  );
}
