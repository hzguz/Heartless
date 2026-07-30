import fs from 'node:fs';
import path from 'node:path';

const root = 'e:/Projetos Coding/heartless';
const src = fs.readFileSync(path.join(root, 'src/lib/i18n.ts'), 'utf8');

// Split the dictionary object into per-language blocks.
const langs = ['en', 'pt', 'ja'];
const dicts = {};
for (let i = 0; i < langs.length; i++) {
  const lang = langs[i];
  const start = src.indexOf(`  ${lang}: {`);
  if (start < 0) { console.log('could not locate', lang); continue; }
  const next = i + 1 < langs.length ? src.indexOf(`  ${langs[i + 1]}: {`) : src.indexOf('} as const');
  const block = src.slice(start, next < 0 ? undefined : next);
  dicts[lang] = [...block.matchAll(/'([a-z][a-zA-Z]*(?:\.[a-zA-Z]+)*)':/g)].map((m) => m[1]);
}

console.log('key counts:', langs.map((l) => `${l}=${(dicts[l] || []).length}`).join('  '));

const en = dicts.en || [];
for (const lang of ['pt', 'ja']) {
  const missing = en.filter((k) => !(dicts[lang] || []).includes(k));
  const extra = (dicts[lang] || []).filter((k) => !en.includes(k));
  console.log(`  ${lang}: ${missing.length ? 'MISSING ' + missing.join(', ') : 'complete'}${extra.length ? ' | EXTRA ' + extra.join(', ') : ''}`);
}

// Collect keys actually referenced through t('...')
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const used = new Set();
for (const f of walk(path.join(root, 'src'))) {
  const content = fs.readFileSync(f, 'utf8');
  for (const m of content.matchAll(/\bt\(\s*'([a-z][a-zA-Z]*(?:\.[a-zA-Z]+)+)'\s*\)/g)) used.add(m[1]);
}

const unused = en.filter((k) => !used.has(k));
console.log('defined but never used via t():', unused.length ? unused.join(', ') : '(none)');

const undefinedKeys = [...used].filter((k) => !en.includes(k));
console.log('used via t() but not defined:', undefinedKeys.length ? undefinedKeys.join(', ') : '(none)');
