import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { loadTasks, saveTasks } from './file-store.ts'

// A scratch folder next to this file (not the system temp directory).
const dir = mkdtempSync(join(import.meta.dirname, 'store-'))
after(() => rmSync(dir, { recursive: true }))

test('a saved list loads back', () => {
  const file = join(dir, 'tasks.json')
  const tasks = [{ id: 'a', title: 'Saved', done: true }]
  saveTasks(file, tasks)
  assert.deepEqual(loadTasks(file), tasks)
})

test('a missing or broken file loads as null', () => {
  assert.equal(loadTasks(join(dir, 'missing.json')), null)
  const broken = join(dir, 'broken.json')
  writeFileSync(broken, '{ not json')
  assert.equal(loadTasks(broken), null)
})
