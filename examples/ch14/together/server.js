// Exercise 3: htmx fetches HTML from the server; Alpine adds client-only
// behavior to it, including to fragments htmx inserts later.
// Run: npm run together, then open http://localhost:4434/
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

const PORT = 4434
const scripts = {
  '/htmx.min.js': readFileSync(new URL(import.meta.resolve('htmx.org/dist/htmx.min.js'))),
  '/alpine.min.js': readFileSync(new URL(import.meta.resolve('alpinejs/dist/cdn.min.js'))),
}

let cards = 0

// A server-rendered fragment that carries its own Alpine component.
function card(n) {
  return `<article x-data="{ open: false }">
  <h2>Card ${n}</h2>
  <button type="button" :aria-expanded="open" @click="open = !open">Details</button>
  <p x-show="open">Rendered by the server at ${new Date().toISOString()}.</p>
</article>`
}

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>htmx + Alpine</title>
    <script src="/htmx.min.js"></script>
    <script defer src="/alpine.min.js"></script>
  </head>
  <body>
    <button type="button" hx-get="/card" hx-target="#cards" hx-swap="beforeend">Load a card</button>
    <div id="cards"></div>
  </body>
</html>
`

createServer((request, response) => {
  const script = scripts[request.url]
  if (script) {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(script)
  } else if (request.url === '/card') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(card(++cards))
  } else if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page)
  } else {
    response.writeHead(404).end('Not found')
  }
}).listen(PORT, () => console.log(`htmx + Alpine on http://localhost:${PORT}/`))
