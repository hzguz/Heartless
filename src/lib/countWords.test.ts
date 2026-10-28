import { describe, expect, it } from 'vitest';
import { countWords } from '@/components/StatusBar';

describe('countWords', () => {
  it('returns 0 for empty or whitespace-only strings', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \t\n\r  ')).toBe(0);
  });

  it('counts words separated by spaces, tabs, and newlines', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  one\ttwo\nthree\r\nfour  ')).toBe(4);
  });

  it('handles non-breaking spaces (char code 160)', () => {
    expect(countWords('alpha\u00A0beta\u00A0\u00A0gamma')).toBe(3);
  });
});
