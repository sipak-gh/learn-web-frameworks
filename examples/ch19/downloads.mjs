// Usage: node downloads.mjs [package …]
//
// npm downloads for the last four full weeks (Monday to Sunday), from the
// public api.npmjs.org endpoints, and the average of the four. One week alone
// moves with holidays, CI changes and releases; the average moves less.
// Requests are a second apart to stay under the API's rate limit.
const packages = process.argv.length > 2
  ? process.argv.slice(2)
  : ['react', 'vue', 'svelte', '@angular/core', 'solid-js', 'preact', 'lit', 'alpinejs', 'htmx.org', 'mithril']

const api = 'https://api.npmjs.org/downloads'
const { end } = await (await fetch(`${api}/point/last-week/react`)).json()
const day = (date, offset) => new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10)
const start = day(end, -27)
const n = (value) => value.toLocaleString('en-US').padStart(12)

console.log(`Weeks ending ${[21, 14, 7, 0].map((d) => day(end, -d)).join(', ')}\n`)
console.log(`${'package'.padEnd(14)} ${['week 1', 'week 2', 'week 3', 'week 4', 'average'].map((h) => h.padStart(12)).join(' ')}`)
for (const name of packages) {
  await new Promise((r) => setTimeout(r, 1000))
  const response = await fetch(`${api}/range/${start}:${end}/${name}`)
  if (!response.ok) {
    console.log(`${name.padEnd(14)} HTTP ${response.status}, try again later`)
    continue
  }
  const { downloads } = await response.json()
  const weeks = [0, 7, 14, 21].map((i) => downloads.slice(i, i + 7).reduce((sum, d) => sum + d.downloads, 0))
  const average = Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length)
  console.log(`${name.padEnd(14)} ${[...weeks, average].map(n).join(' ')}`)
}
