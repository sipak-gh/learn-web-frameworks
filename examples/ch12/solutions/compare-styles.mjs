// Compares the computed styles of the first task in two builds of Lit Tasklet.
// Usage: node solutions/compare-styles.mjs <dist-a> <dist-b>
// (build a copy of tasklet/lit with solutions/task-item-shadow.ts as its
// src/components/task-item.ts to get the second dist folder)
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }
const browser = await chromium.launch()

for (const dir of process.argv.slice(2).map((dir) => resolve(dir))) {
  const page = await browser.newPage()
  await page.route('http://tasklet.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, '/index.html')
    try {
      await route.fulfill({ body: await readFile(join(dir, path)), contentType: TYPES[extname(path)] })
    } catch {
      await route.fulfill({ status: 404 })
    }
  })
  await page.goto('http://tasklet.test/')
  await page.getByRole('checkbox').first().waitFor()
  const styles = await page.evaluate(() => {
    const item = document.querySelector('tasklet-app').shadowRoot.querySelector('task-item')
    const root = item.shadowRoot ?? item
    const pick = (element, names) =>
      Object.fromEntries(names.map((name) => [name, getComputedStyle(element)[name]]))
    return {
      shadowRoot: item.shadowRoot !== null,
      '.delete': pick(root.querySelector('.delete'), ['padding', 'borderColor', 'backgroundColor', 'color', 'fontSize']),
      'li.task': pick(item.closest('li'), ['display', 'borderBottom']),
      '.task label': pick(root.querySelector('label'), ['display', 'cursor']),
    }
  })
  console.log(JSON.stringify(styles))
  await page.close()
}

await browser.close()
