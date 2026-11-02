// Opens index.html in headless Chromium and prints what the chip does.
// Run: npm install && npx playwright install chromium && npm run verify
import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(new URL('index.html', import.meta.url).href)

const facts = await page.evaluate(() => {
  const signal = document.getElementById('signal')
  const button = signal.shadowRoot.querySelector('button')
  const [defaultSlot, hintSlot] = signal.shadowRoot.querySelectorAll('slot')
  const style = (element) => getComputedStyle(element).backgroundColor
  return {
    defined: customElements.get('toggle-chip') !== undefined,
    shadowMode: signal.shadowRoot.mode,
    lightDomText: signal.textContent,
    defaultSlot: defaultSlot.assignedNodes().map((node) => node.textContent),
    hintSlot: hintSlot.assignedElements().map((element) => element.outerHTML),
    emptyChipShowsFallback: document.getElementById('empty').shadowRoot.querySelector('slot').assignedNodes().length === 0,
    queryFromOutside: document.querySelector('toggle-chip button'),
    pageButtonBackground: style(document.querySelector('p > button')),
    chipButtonBackground: style(button),
    pressedChipBackground: style(document.getElementById('vue').shadowRoot.querySelector('button')),
    partFontSize: getComputedStyle(document.getElementById('vue').shadowRoot.querySelector('button')).fontSize,
  }
})
for (const [key, value] of Object.entries(facts)) console.log(`${key}:`, JSON.stringify(value))

// Attributes and properties.
const chip = page.locator('#signal')
console.log('\npressed property:', await chip.evaluate((el) => el.pressed))
await chip.evaluate((el) => (el.pressed = true))
console.log('after el.pressed = true -> attribute:', await chip.getAttribute('pressed'), '| aria-pressed:',
  await chip.evaluate((el) => el.shadowRoot.querySelector('button').getAttribute('aria-pressed')))
await chip.evaluate((el) => el.setAttribute('pressed', 'false'))
console.log('after setAttribute("pressed", "false") -> property:', await chip.evaluate((el) => el.pressed))
await chip.evaluate((el) => el.removeAttribute('pressed'))
console.log('after removeAttribute("pressed") -> property:', await chip.evaluate((el) => el.pressed))

// Events: a click inside the shadow root, heard on document.
await page.getByRole('button', { name: 'Write a signal 5 min' }).click()
console.log('\nafter clicking the chip -> log:', await page.locator('#log').textContent())
const retargeted = await page.evaluate(() => new Promise((resolve) => {
  document.addEventListener('click', (event) => resolve(event.target.localName), { once: true })
  document.getElementById('vue').shadowRoot.querySelector('button').click()
}))
console.log('a click inside the shadow root, seen from document -> event.target:', retargeted)

// Upgrade: a property set before the element is defined.
const upgraded = await page.evaluate(async () => {
  const el = document.createElement('late-chip')
  el.pressed = true // a plain own property: <late-chip> isn't defined yet
  document.body.append(el)
  customElements.define('late-chip', class extends customElements.get('toggle-chip') {})
  return { property: el.pressed, attribute: el.getAttribute('pressed') }
})
console.log('property set before define -> after upgrade:', JSON.stringify(upgraded))

await browser.close()
