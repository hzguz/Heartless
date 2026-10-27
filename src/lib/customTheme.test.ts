import { describe, expect, it } from 'vitest';
import { isLegacyCustomTheme, parseCustomTheme } from './customTheme';

describe('parseCustomTheme', () => {
  it('accepts the current single-palette shape', () => {
    const theme = { name: 'Ocean', base: 'dark', colors: { '--color-paper': '#102030' } };
    expect(parseCustomTheme(theme)).toEqual(theme);
  });

  it('reduces a legacy two-palette theme to the requested side', () => {
    const legacy = {
      name: 'Old',
      light: { '--color-paper': '#FFFFFF' },
      dark: { '--color-paper': '#000000' },
    };
    expect(parseCustomTheme(legacy, 'dark')).toEqual({
      name: 'Old',
      base: 'dark',
      colors: { '--color-paper': '#000000' },
    });
    expect(parseCustomTheme(legacy)).toMatchObject({ base: 'light', colors: { '--color-paper': '#FFFFFF' } });
  });

  it('drops unknown tokens and non-hex values', () => {
    const theme = {
      name: 'x',
      base: 'light',
      colors: {
        '--color-paper': '#ABCDEF',
        '--color-text': 'red; background: url(evil)',
        '--color-accent': '#FFF',
        '--not-a-token': '#000000',
      },
    };
    expect(parseCustomTheme(theme)?.colors).toEqual({ '--color-paper': '#ABCDEF' });
  });

  it('falls back to a default name and caps long names', () => {
    expect(parseCustomTheme({ base: 'cream', colors: {} })?.name).toBe('Custom');
    expect(parseCustomTheme({ name: '  ', base: 'cream', colors: {} })?.name).toBe('Custom');
    expect(parseCustomTheme({ name: 'a'.repeat(200), base: 'cream', colors: {} })?.name).toHaveLength(60);
  });

  it('rejects anything that is not a theme', () => {
    expect(parseCustomTheme(null)).toBeNull();
    expect(parseCustomTheme('theme')).toBeNull();
    expect(parseCustomTheme([])).toBeNull();
    expect(parseCustomTheme({ base: 'neon', colors: {} })).toBeNull();
    expect(parseCustomTheme({ name: 'x', light: {} })).toBeNull();
  });
});

describe('isLegacyCustomTheme', () => {
  it('distinguishes the legacy shape from the current one', () => {
    expect(isLegacyCustomTheme({ name: 'x', light: {}, dark: {} })).toBe(true);
    expect(isLegacyCustomTheme({ name: 'x', base: 'light', colors: {} })).toBe(false);
    expect(isLegacyCustomTheme(undefined)).toBe(false);
  });
});
