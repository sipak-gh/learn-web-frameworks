// Serves this folder on http://localhost:4335/ and strips TypeScript types so the browser can run .ts files.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { extname, join } from 'node:path'

const types: Record<string, string> = { '.html': 'text/html', '.ts': 'text/javascript' }

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const file = join(import.meta.dirname, path === '/' ? 'counter.html' : path)
  const type = types[extname(file)]
  try {
    if (!type) throw new Error('unsupported file type')
    let body = await readFile(file, 'utf8')
    if (extname(file) === '.ts') body = stripTypeScriptTypes(body)
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }).end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(4335, () => console.log('Serving http://localhost:4335/'))
