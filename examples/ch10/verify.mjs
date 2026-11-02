// Opens each example in headless Chromium and prints what it observed.
// Files are served from this folder through a routed fake origin, so no
// server or port is needed and ES modules load as they would over HTTP.
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { chromium } from '@playwright/test'

const ORIGIN = 'http://ch10.test'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' }

const browser = await chromium.launch()

async function open(path) {
  const page = await browser.newPage()
  await page.route(`${ORIGIN}/**`, async (route) => {
    const file = join(import.meta.dirname, new URL(route.request().url()).pathname)
    try {
      await route.fulfill({ body: await readFile(file), contentType: TYPES[extname(file)] })
    } catch {
      await route.fulfill({ status: 404 })
    }
  })
  await page.goto(`${ORIGIN}/${path}`)
  return page
}

// Mithril batches redraws to the next animation frame; wait for one.
const nextFrame = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))))

// Exercise 1: a timer changes state but isn't an event handler.
for (const path of ['clock.html', 'solutions/clock.html']) {
  const page = await open(path)
  await page.waitForTimeout(2300)
  const before = await page.textContent('p')
  await page.click('button')
  await nextFrame(page)
  const after = await page.textContent('p')
  console.log(`${path}: after 2.3 s "${before}"; after clicking Refresh "${after}"`)
  await page.close()
}

// Exercise 2: the filter lives in the URL.
{
  const page = await open('solutions/route.html#!/done')
  const items = () => page.$$eval('li', (lis) => lis.map((li) => li.textContent))
  console.log(`route #!/done: ${JSON.stringify(await items())}`)
  await page.click('text=active')
  await page.waitForSelector('a[aria-current="page"][href="#!/active"]')
  console.log(`clicked "active": ${await page.evaluate(() => location.hash)} ${JSON.stringify(await items())}`)
  await page.goBack()
  await page.waitForSelector('a[aria-current="page"][href="#!/done"]')
  console.log(`back: ${await page.evaluate(() => location.hash)} ${JSON.stringify(await items())}`)
  await page.goto(`${ORIGIN}/solutions/route.html#!/someday`)
  await page.waitForFunction(() => location.hash === '#!/all')
  console.log(`route #!/someday redirected to ${await page.evaluate(() => location.hash)}`)
  await page.close()
}

// Exercise 3: lifecycle order.
{
  const page = await open('lifecycle.html')
  await page.click('text=Redraw')
  await nextFrame(page)
  await page.click('text=Toggle') // hide
  await page.waitForFunction(() => document.getElementById('log').textContent.includes('onbeforeremove'))
  const during = await page.$$eval('li', (lis) => lis.length)
  await page.waitForFunction(() => document.getElementById('log').textContent.includes('onremove'))
  const afterwards = await page.$$eval('li', (lis) => lis.length)
  await page.click('text=Toggle') // show again
  await nextFrame(page)
  console.log(`lifecycle: <li> count after onbeforeremove ${during}, after onremove ${afterwards}`)
  console.log((await page.textContent('#log')).trimEnd())
  await page.close()
}

// Exercise 4: what a toggle does to the list's elements and to focus.
for (const path of ['solutions/van-core-list.html', 'solutions/vanx-list.html']) {
  const page = await open(path)
  await page.waitForSelector('li')
  await page.evaluate(() => (window.firstItem = document.querySelector('li')))
  await page.focus('li:nth-child(2) input')
  await page.keyboard.press('Space')
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
  const result = await page.evaluate(() => ({
    sameFirstItem: window.firstItem === document.querySelector('li'),
    focused: document.activeElement.tagName,
    done: [...document.querySelectorAll('li.done')].map((li) => li.textContent.trim()),
  }))
  console.log(`${path}: ${JSON.stringify(result)}`)
  await page.close()
}

await browser.close()
