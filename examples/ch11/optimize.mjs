// Runs Qwik's optimizer (the Rust/WASM compiler that the Vite plugin uses)
// on one file and prints every module it writes, with segment details.
// Usage: node optimize.mjs <file.tsx> [--code]
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createOptimizer } from "@builder.io/qwik/optimizer";

const [file, flag] = process.argv.slice(2);
const optimizer = await createOptimizer();
const result = await optimizer.transformModules({
  input: [{ path: basename(file), code: await readFile(file, "utf8") }],
  srcDir: import.meta.dirname,
  entryStrategy: { type: "segment" },
  minify: "simplify",
  transpileTs: true,
  transpileJsx: true,
  explicitExtensions: true,
  mode: "prod",
});

for (const diagnostic of result.diagnostics) {
  console.log(`${diagnostic.category}: ${diagnostic.message}`);
}
for (const module of result.modules) {
  const segment = module.segment;
  console.log(`\n// ${module.path}`);
  if (segment) {
    console.log(
      `//   segment ${segment.displayName} (${segment.ctxKind} ${segment.ctxName}), captures: ${JSON.stringify(segment.captures)}`,
    );
  }
  if (flag === "--code") console.log(module.code.trimEnd());
}
