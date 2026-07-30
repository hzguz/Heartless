import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'e:/Projetos Coding/heartless';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [
  ...walk(path.join(ROOT, 'src')),
  ...walk(path.join(ROOT, 'electron')),
];
const sources = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));

const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
const wordCount = (text, sym) => (text.match(new RegExp(`\\b${sym}\\b`, 'g')) || []).length;

const findings = { orphanCycle: [], singleUseHelper: [], unusedExport: [] };

for (const [file, src] of sources) {
  // Every top-level function/const declaration in this file.
  const decls = [
    ...src.matchAll(/^(export\s+)?(?:async\s+)?function\s+(\w+)/gm),
  ].map((m) => ({ name: m[2], exported: !!m[1] }));

  for (const { name, exported } of decls) {
    const localRefs = wordCount(src, name);           // includes the declaration itself
    const externalRefs = [...sources.entries()]
      .filter(([f]) => f !== file)
      .reduce((n, [, s]) => n + wordCount(s, name), 0);

    // Declaration-only: appears once in its own file, nowhere else.
    if (localRefs <= 1 && externalRefs === 0) {
      findings.orphanCycle.push(`${name} — ${rel(file)} (declared, never referenced)`);
      continue;
    }
    // Exported but nobody outside imports it -> export keyword is noise.
    if (exported && externalRefs === 0 && localRefs >= 2) {
      findings.unusedExport.push(`${name} — ${rel(file)} (exported, only used internally)`);
    }
    // Non-exported helper used exactly once -> candidate for inlining.
    if (!exported && localRefs === 2 && externalRefs === 0) {
      findings.singleUseHelper.push(`${name} — ${rel(file)} (used once)`);
    }
  }
}

const show = (title, list) => {
  console.log(`\n## ${title} (${list.length})`);
  if (!list.length) console.log('  (none)');
  else list.forEach((l) => console.log('  ' + l));
};

show('Declared but never referenced', findings.orphanCycle);
show('Exported without external consumer', findings.unusedExport);
show('Single-use private helpers', findings.singleUseHelper);
