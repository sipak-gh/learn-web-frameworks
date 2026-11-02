// Exercise 2: active search. Type in the box and the matching frameworks
// appear; without JavaScript the form still works (press Enter).
// Run: npm run search, then open http://localhost:4333/
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { html, type Html } from '../../../tasklet/htmx/src/html.ts'

const PORT = 4333
const htmx = readFileSync(new URL(import.meta.resolve('htmx.org/dist/htmx.min.js')))

const FRAMEWORKS = [
  'React', 'Vue', 'Svelte', 'Angular', 'Solid', 'Preact', 'Mithril',
  'VanJS', 'Qwik', 'Lit', 'htmx', 'Alpine.js',
]

function results(query: string): Html {
  const q = query.trim().toLowerCase()
  const found = FRAMEWORKS.filter((name) => name.toLowerCase().includes(q))
  if (found.length === 0) return html`<p>No match for “${query}”.</p>`
  return html`<ul>${found.map((name) => html`<li>${name}</li>`)}</ul>`
}

function page(query: string): Html {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Active search</title>
    <script src="/htmx.min.js"></script>
  </head>
  <body>
    <form action="/search" role="search">
      <label for="q">Search frameworks</label>
      <input id="q" type="search" name="q" value="${query}" autocomplete="off"
        hx-get="/search" hx-trigger="input changed delay:300ms, search"
        hx-target="#results" hx-sync="this:replace" hx-indicator="#searching">
      <span id="searching" class="htmx-indicator">Searching…</span>
    </form>
    <div id="results" aria-live="polite">${results(query)}</div>
  </body>
</html>
`
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname === '/htmx.min.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(htmx)
    return
  }
  if (url.pathname !== '/' && url.pathname !== '/search') {
    response.writeHead(404).end('Not found')
    return
  }
  const query = url.searchParams.get('q') ?? ''
  // htmx asks for the fragment; a browser without JavaScript gets the page.
  const body = request.headers['hx-request'] === 'true' ? results(query) : page(query)
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Vary: 'HX-Request' }).end(body.value)
}).listen(PORT, () => console.log(`Active search on http://localhost:${PORT}/`))
