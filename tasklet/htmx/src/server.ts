// The Tasklet server, built on node:http alone. Browsers get full pages;
// htmx requests (they carry an `HX-Request: true` header) get fragments.
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Html } from './html.ts'
import { addTask, allTasks, clearDone, parseFilter, removeTask, resetTasks, toggleTask } from './tasks.ts'
import { afterChange, afterFilter, page } from './views.ts'

const PORT = Number(process.env.PORT ?? 4312)

const ASSETS: Record<string, { body: Buffer; type: string }> = {
  '/tasklet.css': {
    body: readFileSync(new URL('../public/tasklet.css', import.meta.url)),
    type: 'text/css; charset=utf-8',
  },
  '/htmx.min.js': {
    body: readFileSync(new URL(import.meta.resolve('htmx.org/dist/htmx.min.js'))),
    type: 'text/javascript; charset=utf-8',
  },
}

// The changes the page can ask for. `run` returns false if the task is missing.
const ACTIONS: { method: string; path: RegExp; run: (params: URLSearchParams, id: string) => boolean }[] = [
  {
    method: 'POST',
    path: /^\/tasks$/,
    run: (params) => {
      const title = (params.get('title') ?? '').trim()
      if (title !== '') addTask(title)
      return true
    },
  },
  {
    method: 'POST',
    path: /^\/tasks\/clear-done$/,
    run: () => {
      clearDone()
      return true
    },
  },
  { method: 'POST', path: /^\/tasks\/([^/]+)\/toggle$/, run: (_, id) => toggleTask(id) },
  { method: 'DELETE', path: /^\/tasks\/([^/]+)$/, run: (_, id) => removeTask(id) },
]

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const fromHtmx = request.headers['hx-request'] === 'true'

  const asset = request.method === 'GET' ? ASSETS[url.pathname] : undefined
  if (asset) {
    response.writeHead(200, { 'Content-Type': asset.type }).end(asset.body)
    return
  }

  // The acceptance test calls this before every test.
  if (request.method === 'POST' && url.pathname === '/__reset') {
    resetTasks()
    response.writeHead(204).end()
    return
  }

  if (request.method === 'GET' && url.pathname === '/') {
    const filter = parseFilter(url.searchParams.get('filter'))
    sendHtml(response, fromHtmx ? afterFilter(allTasks(), filter) : page(allTasks(), filter))
    return
  }

  for (const action of ACTIONS) {
    const match = request.method === action.method ? action.path.exec(url.pathname) : null
    if (!match) continue
    const params = await readParams(request, url)
    if (!action.run(params, decodeURIComponent(match[1] ?? ''))) break
    if (fromHtmx) {
      sendHtml(response, afterChange(allTasks(), parseFilter(params.get('filter'))))
    } else {
      // A plain form post: Post/Redirect/Get back to the page.
      response.writeHead(303, { Location: '/' }).end()
    }
    return
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
}

function sendHtml(response: ServerResponse, body: Html): void {
  // The same URL answers with a page or a fragment, so caches must key on the header.
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Vary: 'HX-Request' }).end(body.value)
}

// Parameters from the query string (GET, and DELETE in htmx 2) and from a
// form-encoded body (POST).
async function readParams(request: IncomingMessage, url: URL): Promise<URLSearchParams> {
  const params = new URLSearchParams(url.search)
  let body = ''
  request.setEncoding('utf8')
  for await (const chunk of request) {
    body += chunk
    if (body.length > 10_000) throw new Error('Request body too large')
  }
  for (const [name, value] of new URLSearchParams(body)) params.append(name, value)
  return params
}

createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    console.error(error)
    if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Bad request')
  })
}).listen(PORT, () => {
  console.log(`Tasklet (htmx) on http://localhost:${PORT}/`)
})
