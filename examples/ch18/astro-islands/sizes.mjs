// Usage: node sizes.mjs [page.html]  (after npm run build)
// For each island on the page, follows the static imports of its component and
// renderer files and adds up the JavaScript the browser downloads for it.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const page = process.argv[2] ?? 'index.html';
const html = readFileSync(`dist/${page}`, 'utf8');
const kB = (n) => (n / 1024).toFixed(1).padStart(6) + ' kB';
const gz = (text) => gzipSync(text, { level: 9 }).length;

function closure(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  const code = readFileSync(`dist/_astro/${file}`, 'utf8');
  for (const [, dep] of code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) {
    closure(dep, seen);
  }
  return seen;
}

const rows = [];
const all = new Set();
for (const [tag] of html.matchAll(/<astro-island\b[^>]*>/g)) {
  const attr = (name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  const name = JSON.parse(attr('opts').replaceAll('&quot;', '"')).name;
  const files = new Set();
  for (const url of [attr('component-url'), attr('renderer-url')]) {
    closure(url.replace('/_astro/', ''), files);
  }
  files.forEach((f) => all.add(f));
  const code = [...files].map((f) => readFileSync(`dist/_astro/${f}`, 'utf8'));
  rows.push([`${name} (client:${attr('client')})`, files.size, code.join('').length, gz(code.join(''))]);
}

const inline = [...html.matchAll(/<script>(.*?)<\/script>/gs)].map((m) => m[1]).join('');
rows.push(['inline <script> in the HTML', 0, inline.length, gz(inline)]);
const unique = [...all].map((f) => readFileSync(`dist/_astro/${f}`, 'utf8')).join('') + inline;
rows.push(['whole page (no duplicates)', all.size, unique.length, gz(unique)]);

console.log(`${'island'.padEnd(30)} files        raw       gzip`);
for (const [label, files, raw, gzip] of rows) {
  console.log(`${label.padEnd(30)} ${String(files).padStart(5)} ${kB(raw)} ${kB(gzip)}`);
}
