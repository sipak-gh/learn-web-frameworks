// Exercise 2: print the version npm installs today (the `latest` tag) and any
// `next` pre-release for a few of the packages in this course.
// Run: node latest-versions.mjs [package ...]
const packages = process.argv.slice(2)
if (packages.length === 0) packages.push('react', 'vue', 'svelte', 'solid-js', 'htmx.org')

for (const name of packages) {
  const response = await fetch(`https://registry.npmjs.org/${name}`)
  if (!response.ok) {
    console.log(`${name.padEnd(16)} not found (HTTP ${response.status})`)
    continue
  }
  const { 'dist-tags': tags, time } = await response.json()
  const date = time[tags.latest].slice(0, 10)
  const next = tags.next ? `  next: ${tags.next}` : ''
  console.log(`${name.padEnd(16)} ${tags.latest.padEnd(11)} (${date})${next}`)
}
