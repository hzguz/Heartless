import { app, IpcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface SnippetMeta {
  id: string;
  name: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
}

interface Manifest {
  version: 1;
  snippets: SnippetMeta[];
}

function vaultRoot(): string {
  return path.join(app.getPath('userData'), 'snippets');
}
function contentDir(): string {
  return path.join(vaultRoot(), 'content');
}
function manifestPath(): string {
  return path.join(vaultRoot(), 'manifest.json');
}

let vaultInitialized = false;
let cachedManifest: Manifest | null = null;

async function ensureVault(): Promise<void> {
  if (vaultInitialized) return;
  await fs.mkdir(contentDir(), { recursive: true });
  try {
    await fs.access(manifestPath());
  } catch {
    const empty: Manifest = { version: 1, snippets: [] };
    await fs.writeFile(manifestPath(), JSON.stringify(empty, null, 2), 'utf-8');
    cachedManifest = empty;
  }
  vaultInitialized = true;
}

async function readManifest(): Promise<Manifest> {
  if (cachedManifest) return cachedManifest;
  await ensureVault();
  const raw = await fs.readFile(manifestPath(), 'utf-8');
  try {
    const parsed = JSON.parse(raw) as Manifest;
    cachedManifest = parsed.snippets ? parsed : { version: 1, snippets: [] };
    return cachedManifest;
  } catch {
    cachedManifest = { version: 1, snippets: [] };
    return cachedManifest;
  }
}

async function writeManifest(m: Manifest): Promise<void> {
  cachedManifest = m;
  await fs.writeFile(manifestPath(), JSON.stringify(m, null, 2), 'utf-8');
}

export function registerSnippetHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('snippets:list', async (): Promise<SnippetMeta[]> => {
    const m = await readManifest();
    return [...m.snippets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  ipcMain.handle('snippets:create', async (_e, name: string, body: string): Promise<SnippetMeta> => {
    await ensureVault();
    const m = await readManifest();
    const id = randomUUID();
    const filename = `${id}.md`;
    const now = new Date().toISOString();
    const meta: SnippetMeta = {
      id,
      name: name.trim() || 'Untitled snippet',
      filename,
      createdAt: now,
      updatedAt: now,
    };
    await fs.writeFile(path.join(contentDir(), filename), body, 'utf-8');
    m.snippets.push(meta);
    await writeManifest(m);
    return meta;
  });

  ipcMain.handle('snippets:read', async (_e, id: string): Promise<string> => {
    const m = await readManifest();
    const meta = m.snippets.find((s) => s.id === id);
    if (!meta) throw new Error('Snippet not found');
    return fs.readFile(path.join(contentDir(), meta.filename), 'utf-8');
  });

  ipcMain.handle('snippets:rename', async (_e, id: string, name: string): Promise<boolean> => {
    const m = await readManifest();
    const meta = m.snippets.find((s) => s.id === id);
    if (!meta) return false;
    meta.name = name.trim() || meta.name;
    meta.updatedAt = new Date().toISOString();
    await writeManifest(m);
    return true;
  });

  ipcMain.handle('snippets:delete', async (_e, id: string): Promise<boolean> => {
    const m = await readManifest();
    const meta = m.snippets.find((s) => s.id === id);
    if (!meta) return false;
    try {
      await fs.unlink(path.join(contentDir(), meta.filename));
    } catch {
      // ignore missing file
    }
    m.snippets = m.snippets.filter((s) => s.id !== id);
    await writeManifest(m);
    return true;
  });
}
