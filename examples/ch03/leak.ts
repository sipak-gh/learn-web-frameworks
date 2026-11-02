// Exercise 3: a listener added on every render, and the fix.
// Run: node leak.ts
const page = new EventTarget() // stands in for `document`

let shortcutRuns = 0
function renderLeaky() {
  page.addEventListener('keydown', () => shortcutRuns++)
}

for (let i = 0; i < 3; i++) renderLeaky()
page.dispatchEvent(new Event('keydown'))
console.log('leaky: one key press ran the shortcut', shortcutRuns, 'times')

let fixedRuns = 0
let controller: AbortController | undefined
function renderFixed() {
  controller?.abort() // removes the listener the previous render added
  controller = new AbortController()
  page.addEventListener('keydown', () => fixedRuns++, { signal: controller.signal })
}

for (let i = 0; i < 3; i++) renderFixed()
page.dispatchEvent(new Event('keydown'))
console.log('fixed: one key press ran the shortcut', fixedRuns, 'time')
