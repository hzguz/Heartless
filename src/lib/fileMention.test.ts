import { describe, expect, it } from 'vitest';
import { filterEntries } from './fileMention';
import type { DirEntry } from '@/types';

const entry = (name: string, isDirectory = false): DirEntry => ({
  name,
  path: `/p/${name}`,
  isDirectory,
});

describe('filterEntries', () => {
  const entries = [
    entry('App.tsx'),
    entry('README.md'),
    entry('components', true),
    entry('index.ts'),
  ];

  it('returns the head of the list when the query is empty', () => {
    expect(filterEntries(entries, '').map((e) => e.name)).toEqual([
      'App.tsx', 'README.md', 'components', 'index.ts',
    ]);
  });

  it('matches on a substring, not just a prefix', () => {
    expect(filterEntries(entries, 'pp').map((e) => e.name)).toEqual(['App.tsx']);
  });

  it('ignores case in both query and name', () => {
    expect(filterEntries(entries, 'readme').map((e) => e.name)).toEqual(['README.md']);
    expect(filterEntries(entries, 'APP').map((e) => e.name)).toEqual(['App.tsx']);
  });

  it('includes directories', () => {
    expect(filterEntries(entries, 'comp').map((e) => e.name)).toEqual(['components']);
  });

  it('returns nothing when there is no match', () => {
    expect(filterEntries(entries, 'zzz')).toEqual([]);
  });

  it('caps results so the popover cannot grow unbounded', () => {
    const many = Array.from({ length: 50 }, (_, i) => entry(`file${i}.ts`));
    expect(filterEntries(many, '')).toHaveLength(8);
    expect(filterEntries(many, 'file')).toHaveLength(8);
  });

  it('does not mutate the input array', () => {
    const input = [...entries];
    filterEntries(input, 'app');
    expect(input).toEqual(entries);
  });
});
