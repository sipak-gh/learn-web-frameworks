// A static file server in 30 lines: all a no-build site needs.
// Usage: node serve.mjs [port]   (serves this folder)
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const root = import.meta.dirname
const port = Number(process.argv[2] ?? 4337)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript', // module scripts are refused without a JavaScript MIME type
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let path = normalize(join(root, decodeURIComponent(url.pathname)))
  if (path !== root && !path.startsWith(root + sep)) return response.writeHead(403).end()
  try {
    if (statSync(path).isDirectory()) path = join(path, 'index.html')
    statSync(path)
  } catch {
    return response.writeHead(404).end('Not found')
  }
  response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(response)
}).listen(port, () => console.log(`http://localhost:${port}/no-build/`))
