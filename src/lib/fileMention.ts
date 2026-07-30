import type { DirEntry } from '@/types';

const MAX_MENTION_RESULTS = 8;

export function filterEntries(entries: DirEntry[], query: string): DirEntry[] {
  if (!query) return entries.slice(0, MAX_MENTION_RESULTS);
  const lower = query.toLowerCase();
  return entries
    .filter((e) => e.name.toLowerCase().includes(lower))
    .slice(0, MAX_MENTION_RESULTS);
}
