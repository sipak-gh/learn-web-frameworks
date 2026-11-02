// Usage: node first-load.mjs [app …]   (default: react qwik svelte)
//
// Opens each built Tasklet app in headless Chromium and adds up, gzipped, the
// HTML, JavaScript and CSS the browser fetched: first until the task list is
// on screen, then again after one click on a checkbox. Run the app's build
// first (tasklet/tools/compare.mjs does). Each server is stopped afterwards.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'

const TASKLET_DIR = resolve(import.meta.dirname, '../../tasklet')
const apps = process.argv.length > 2 ? process.argv.slice(2) : ['react', 'qwik', 'svelte']
const counted = new Set(['document', 'script', 'stylesheet'])

async function waitUntilUp(url) {
  for (const deadline = Date.now() + 30_000; Date.now() < deadline; ) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(1000) })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  throw new Error(`${url} did not start`)
}

const browser = await chromium.launch()
console.log('app        first load (JS of it)          after one click')
for (const id of apps) {
  const app = JSON.parse(readFileSync(join(TASKLET_DIR, id, 'tasklet.json'), 'utf8'))
  const url = `http://localhost:${app.port}/`
  const server = spawn(app.serve, { cwd: join(TASKLET_DIR, id), shell: true, detached: true, stdio: 'ignore' })
  try {
    await waitUntilUp(url)
    const page = await browser.newPage()
    const fetched = []
    page.on('response', (response) => {
      const type = response.request().resourceType()
      if (!counted.has(type)) return
      const body = response.body().catch(() => Buffer.alloc(0))
      fetched.push(body.then((bytes) => ({ type, gzip: gzipSync(bytes, { level: 9 }).length })))
    })
    const total = async () => {
      const files = await Promise.all(fetched)
      const kb = (list) => (list.reduce((sum, f) => sum + f.gzip, 0) / 1000).toFixed(2)
      return `${files.length} files ${kb(files)} kB (${kb(files.filter((f) => f.type === 'script'))})`
    }
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.getByRole('list', { name: 'Tasks' }).waitFor()
    const first = await total()
    await page.getByRole('checkbox').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    console.log(`${id.padEnd(10)} ${first.padEnd(30)} ${await total()}`)
    await page.close()
  } finally {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      // Already gone.
    }
  }
}
await browser.close()
