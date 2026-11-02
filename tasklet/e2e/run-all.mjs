#!/usr/bin/env node
// Builds, serves and tests Tasklet apps, then prints a summary.
//
//   node run-all.mjs              every tasklet/<app>/ that has a tasklet.json
//   node run-all.mjs vue svelte   just these
//
// For each app: npm ci (if node_modules is missing), the manifest's build
// command, the serve command (in its own process group), wait for the port,
// run the Playwright suite against it, stop the server.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const E2E_DIR = import.meta.dirname
const TASKLET_DIR = resolve(E2E_DIR, '..')
const RESULTS_DIR = join(E2E_DIR, 'test-results', 'run-all')

function run(command, cwd, env = {}) {
  console.log(`\n$ ${command}    (in ${cwd})`)
  return spawnSync(command, { cwd, shell: true, stdio: 'inherit', env: { ...process.env, ...env } }).status === 0
}

async function isUp(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) })
    return true
  } catch {
    return false
  }
}

async function waitUntilUp(url, server, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (server.exitCode !== null) return false
    if (await isUp(url)) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

// The server runs in its own process group (detached), so killing -pid stops
// npm and everything it started (vite, node, …).
function startServer(command, cwd) {
  console.log(`\n$ ${command} &    (in ${cwd})`)
  return spawn(command, { cwd, shell: true, detached: true, stdio: ['ignore', 'inherit', 'inherit'] })
}

async function stopServer(server) {
  if (server.exitCode !== null) return
  const exited = new Promise((resolve) => server.once('exit', resolve))
  const kill = (signal) => {
    try {
      process.kill(-server.pid, signal)
    } catch {
      // Already gone.
    }
  }
  kill('SIGTERM')
  const timer = setTimeout(() => kill('SIGKILL'), 5000)
  await exited
  clearTimeout(timer)
}

function readStats(file) {
  try {
    const { stats } = JSON.parse(readFileSync(file, 'utf8'))
    return { passed: stats.expected + stats.flaky, failed: stats.unexpected, skipped: stats.skipped }
  } catch {
    return null
  }
}

const requested = process.argv.slice(2)
const apps = (requested.length > 0 ? requested : readdirSync(TASKLET_DIR).sort()).filter((id) =>
  existsSync(join(TASKLET_DIR, id, 'tasklet.json')),
)
for (const id of requested) {
  if (!apps.includes(id)) console.error(`Skipping "${id}": no tasklet/${id}/tasklet.json`)
}
if (apps.length === 0) process.exit(1)

if (!existsSync(join(E2E_DIR, 'node_modules')) && !run('npm ci', E2E_DIR)) process.exit(1)

let current = null
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (current) await stopServer(current)
    process.exit(130)
  })
}

rmSync(RESULTS_DIR, { recursive: true, force: true })
const rows = []
for (const id of apps) {
  const dir = join(TASKLET_DIR, id)
  const manifest = JSON.parse(readFileSync(join(dir, 'tasklet.json'), 'utf8'))
  const url = `http://localhost:${manifest.port}/`
  const row = { app: id, port: manifest.port, build: 'failed', passed: 0, failed: 0, skipped: 0, note: '' }
  rows.push(row)
  console.log(`\n=== ${manifest.name} (tasklet/${id}, port ${manifest.port}) ===`)

  if (!existsSync(join(dir, 'node_modules')) && !run('npm ci', dir)) {
    row.note = 'npm ci failed'
    continue
  }
  if (!run(manifest.build, dir)) {
    row.note = 'build failed'
    continue
  }
  row.build = 'ok'
  if (await isUp(url)) {
    row.note = `port ${manifest.port} already in use`
    continue
  }

  current = startServer(manifest.serve, dir)
  try {
    if (!(await waitUntilUp(url, current))) {
      row.note = 'server did not start'
      continue
    }
    const results = join(RESULTS_DIR, `${id}.json`)
    run('npx playwright test', E2E_DIR, { APP: id, TASKLET_WEBSERVER: '0', TASKLET_RESULTS: results })
    const stats = readStats(results)
    if (stats) Object.assign(row, stats)
    else row.note = 'no test results'
  } finally {
    await stopServer(current)
    current = null
  }
}

const headers = ['app', 'port', 'build', 'passed', 'failed', 'skipped', 'note']
const table = [headers, ...rows.map((row) => headers.map((key) => String(row[key])))]
const widths = headers.map((_, i) => Math.max(...table.map((cells) => cells[i].length)))
console.log('\nSummary')
for (const cells of table) console.log(cells.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd())

const ok = rows.every((row) => row.build === 'ok' && row.failed === 0 && !row.note && row.passed > 0)
process.exit(ok ? 0 : 1)
