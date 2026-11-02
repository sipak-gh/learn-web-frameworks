// Compiles JSX with babel-preset-solid, the preset that vite-plugin-solid
// uses, and writes each result to out/<name>.js.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { transformSync } from '@babel/core';

const files = ['Counter.jsx', 'Greeting.jsx', 'Parent.jsx', '../../../tasklet/solid/src/components/TaskItem.tsx'];

mkdirSync('out', { recursive: true });
for (const file of files) {
  const { code } = transformSync(readFileSync(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [['babel-preset-solid', { generate: 'dom' }], '@babel/preset-typescript'],
  });
  const out = `out/${basename(file, extname(file))}.js`;
  writeFileSync(out, code + '\n');
  console.log(`${file} -> ${out}`);
}
