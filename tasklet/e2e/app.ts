// Reads the manifest (tasklet.json) of the app under test. Shared by
// playwright.config.ts, the tests and (in spirit) run-all.mjs.
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export interface Skip {
  test: string
  reason: string
}

export interface TaskletApp {
  id: string // folder name under tasklet/, e.g. "vue"
  dir: string // absolute path of that folder
  name: string
  port: number
  build: string
  serve: string
  persistence: 'localStorage' | 'server'
  skip: Skip[]
}

export const TASKLET_DIR = resolve(import.meta.dirname, '..')

export function loadApp(id = process.env.APP): TaskletApp {
  if (!id) {
    throw new Error('Set APP to the app folder to test, for example: APP=vue npx playwright test')
  }
  const dir = join(TASKLET_DIR, id)
  const file = join(dir, 'tasklet.json')
  if (!existsSync(file)) throw new Error(`No manifest at ${file}`)
  const app = { id, dir, ...JSON.parse(readFileSync(file, 'utf8')) } as TaskletApp
  if (!Number.isInteger(app.port)) throw new Error(`${file}: "port" must be a number`)
  if (app.persistence !== 'localStorage' && app.persistence !== 'server') {
    throw new Error(`${file}: "persistence" must be "localStorage" or "server"`)
  }
  app.skip ??= []
  return app
}
