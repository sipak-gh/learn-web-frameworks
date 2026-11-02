// Runs Svelte's own migration (the code behind `npx sv migrate svelte-5`) on a Svelte 4 component.
// Run: node migrate.mjs legacy/TaskItem.svelte
import { readFileSync } from 'node:fs'
import { migrate } from 'svelte/compiler'

const file = process.argv[2] ?? 'legacy/TaskItem.svelte'
console.log(migrate(readFileSync(file, 'utf8'), { filename: file }).code)
