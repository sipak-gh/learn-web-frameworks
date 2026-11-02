import { defineConfig, devices } from '@playwright/test'
import { loadApp } from './app.ts'

// APP=<folder> selects the app under test (see Appendix C, "Running the suite").
const app = loadApp()
const baseURL = process.env.BASE_URL ?? `http://localhost:${app.port}/`
// Server-persisted apps share one data store, so their tests run one at a time.
const serial = app.persistence === 'server'

export default defineConfig({
  testDir: './tests',
  fullyParallel: !serial,
  workers: serial ? 1 : undefined,
  forbidOnly: true,
  retries: 0,
  reporter: process.env.TASKLET_RESULTS
    ? [['list'], ['json', { outputFile: process.env.TASKLET_RESULTS }]]
    : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Starts the app's preview server unless one is already listening (build
  // the app first). run-all.mjs starts its own and sets TASKLET_WEBSERVER=0.
  webServer:
    process.env.TASKLET_WEBSERVER === '0'
      ? undefined
      : {
          command: app.serve,
          cwd: app.dir,
          url: baseURL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
})
