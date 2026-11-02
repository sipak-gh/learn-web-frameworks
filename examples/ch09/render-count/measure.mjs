// Drives the instrumented build and prints which components rendered for
// each user action. Start it first: npm run build && npm run preview
// `node measure.mjs value` measures the Exercise 1 variant (App reads model.left.value).
import { chromium } from '../../../tasklet/e2e/node_modules/@playwright/test/index.mjs'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(process.argv[2] === 'value' ? 'http://localhost:4329/?value' : 'http://localhost:4329/')
await page.getByRole('list', { name: 'Tasks' }).waitFor()

const report = async (action) =>
  console.log(action.padEnd(28), JSON.stringify(await page.evaluate(() => window.takeRenderCounts())))

await report('initial load')
await page.getByLabel('New task').pressSequentially('Write chapter 9')
await report('type 15 characters')
await page.getByRole('button', { name: 'Add' }).click()
await report('add a task')
await page.getByRole('checkbox').first().check()
await report('toggle the first task')
await page.getByRole('button', { name: 'Active' }).click()
await report('filter: Active')
await page.getByRole('button', { name: 'Clear done' }).click()
await report('clear done')

await browser.close()
