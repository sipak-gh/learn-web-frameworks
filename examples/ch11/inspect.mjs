// Prints what a server-rendered (or prerendered) Qwik page carries for
// resuming: the event attributes that point at lazy chunks, and the
// serialized state in <script type="qwik/json">.
// Usage: node inspect.mjs <page.html>
import { readFile } from "node:fs/promises";

const html = await readFile(process.argv[2], "utf8");

console.log("Event attributes:");
for (const [attribute] of html.matchAll(/\bon(?:-document|-window)?:[\w-]+="[^"]*"/g)) {
  console.log(`  ${attribute}`);
}

const json = html.match(/<script type="qwik\/json">(.*?)<\/script>/s)[1];
const { objs } = JSON.parse(json);
console.log(`\nqwik/json: ${json.length} characters, ${objs.length} objects. Plain values among them:`);
console.log(`  ${JSON.stringify(objs.filter((value) => typeof value !== "string" || !/^[\u0001-\u001f]/.test(value)))}`);
