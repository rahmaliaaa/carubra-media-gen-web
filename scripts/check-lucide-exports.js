import fs from 'fs';
import path from 'path';
const m = await import('lucide-react');
const exportsSet = new Set(Object.keys(m));
function listFiles(dir, out=[]) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (['node_modules','.next','dist'].includes(name.name)) continue;
      listFiles(full, out);
    } else {
      if (/\.(ts|tsx|js|jsx|mjs)$/.test(name.name)) out.push(full);
    }
  }
  return out;
}
const files = listFiles(process.cwd());
let problems = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (/from\s+['\"]lucide-react['\"]/g.test(s)) {
    const im = /import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"]/g;
    let m2;
    while ((m2 = im.exec(s)) !== null) {
      const rawNames = m2[1].split(',').map(x => x.trim()).filter(Boolean);
      for (const raw of rawNames) {
        const parts = raw.split(/\s+as\s+/i).map(x=>x.trim());
        const n = parts[0];
        if (!exportsSet.has(n)) problems.push({ file: f, name: n });
      }
    }
    const im2 = /import\s+([^\s,{}]+)\s*,?\s*\{([^}]+)\}\s+from\s+['\"]lucide-react['\"]/g;
    let m3;
    while ((m3 = im2.exec(s)) !== null) {
      const defaultName = m3[1].trim();
      if (defaultName && !exportsSet.has(defaultName)) problems.push({ file: f, name: defaultName });
      const rawNames2 = m3[2].split(',').map(x => x.trim()).filter(Boolean);
      for (const raw of rawNames2) {
        const parts = raw.split(/\s+as\s+/i).map(x=>x.trim());
        const n = parts[0];
        if (!exportsSet.has(n)) problems.push({ file: f, name: n });
      }
    }
  }
}
if (problems.length === 0) {
  console.log('No missing lucide-react exports found');
  process.exit(0);
}
console.log('Missing exports:');
for (const p of problems) console.log(`${p.file}: ${p.name}`);
process.exit(0);
