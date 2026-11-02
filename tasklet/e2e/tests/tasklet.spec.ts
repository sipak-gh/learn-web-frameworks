// The Tasklet acceptance suite. Every app in tasklet/ must pass it (apart
// from the tests its tasklet.json skips, with a reason). It checks behavior
// through roles, accessible names and the exact texts of Appendix C.
import { expect, test, type Page } from '@playwright/test'
import { loadApp } from '../app.ts'

const app = loadApp()
const STORAGE_KEY = 'tasklet:v1'

const SEED = [
  { id: '1', title: 'Read the Vue chapter', done: false },
  { id: '2', title: 'Try Svelte runes', done: false },
  { id: '3', title: 'Write a signal from scratch', done: true },
]

// Every test title, in one place: tasklet.json "skip" entries must match one.
const T = {
  heading: 'shows the heading "Tasklet" and the form, filter and list roles',
  loading: 'shows "Loading tasks…" while tasks.json loads, then the seed tasks',
  error: 'shows an error for a failed response and Retry loads the tasks',
  networkError: 'shows the error for a network failure too',
  add: 'adds a trimmed task, clears the input and ignores blank titles',
  toggle: 'toggles a task with its checkbox',
  remove: 'deletes a task with its Delete button',
  filter: 'filters All, Active and Done with aria-pressed',
  empty: 'shows "Nothing to show." when no task matches the filter',
  count: 'counts the tasks left with correct pluralization',
  clear: 'Clear done is disabled with no done tasks and removes the done ones',
  saves: 'saves the list to localStorage after every change',
  restores: 'uses tasks saved in localStorage without fetching tasks.json',
  invalid: 'ignores invalid saved data and fetches tasks.json',
  reload: 'keeps changes after a reload, with the filter back on All',
} as const

const titles = new Set<string>(Object.values(T))
for (const { test: title } of app.skip) {
  if (!titles.has(title)) throw new Error(`${app.id}/tasklet.json skips an unknown test: "${title}"`)
}

test.beforeEach(async ({ request }, testInfo) => {
  const skip = app.skip.find((entry) => entry.test === testInfo.title)
  test.skip(skip !== undefined, skip?.reason)
  if (app.persistence === 'server') {
    const response = await request.post('/__reset')
    expect(response.ok(), 'POST /__reset must succeed').toBe(true)
  }
})

// --- Locators and helpers -------------------------------------------------

const taskList = (page: Page) => page.getByRole('list', { name: 'Tasks', exact: true })
const items = (page: Page) => taskList(page).getByRole('listitem')
const checkbox = (page: Page, title: string) => page.getByRole('checkbox', { name: title, exact: true })
const deleteButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Delete "${title}"`, exact: true })
const filterButton = (page: Page, name: 'All' | 'Active' | 'Done') =>
  page.getByRole('group', { name: 'Filter', exact: true }).getByRole('button', { name, exact: true })
const newTask = (page: Page) => page.getByRole('textbox', { name: 'New task', exact: true })
const addButton = (page: Page) => page.getByRole('button', { name: 'Add', exact: true })
const count = (page: Page) => page.locator('p.count')
const clearDone = (page: Page) => page.getByRole('button', { name: 'Clear done', exact: true })
const loadingStatus = (page: Page) => page.getByRole('status').filter({ hasText: 'Loading tasks…' })
const errorAlert = (page: Page) => page.getByRole('alert').filter({ hasText: "Couldn't load tasks." })
const retryButton = (page: Page) => page.getByRole('button', { name: 'Retry', exact: true })
const emptyMessage = (page: Page) => page.getByText('Nothing to show.', { exact: true })

type Expected = [title: string, done: boolean]

// Checks the visible list item by item: order, titles, checkboxes, the
// "task" and "done" classes and the Delete buttons.
async function expectTasks(page: Page, expected: Expected[]) {
  await expect(items(page)).toHaveCount(expected.length)
  for (const [index, [title, done]] of expected.entries()) {
    const item = items(page).nth(index)
    await expect(item.getByRole('checkbox', { name: title, exact: true })).toBeChecked({ checked: done })
    await expect(item).toContainClass('task')
    if (done) await expect(item).toContainClass('done')
    else await expect(item).not.toContainClass('done')
    await expect(item.getByRole('button', { name: `Delete "${title}"`, exact: true })).toHaveText('×')
  }
}

const SEED_VIEW: Expected[] = [
  ['Read the Vue chapter', false],
  ['Try Svelte runes', false],
  ['Write a signal from scratch', true],
]

async function openLoaded(page: Page) {
  await page.goto('/')
  await expectTasks(page, SEED_VIEW)
}

// A promise to hold network responses until release() is called.
function gate() {
  let release!: () => void
  const opened = new Promise<void>((resolve) => (release = resolve))
  return { opened, release }
}

function readStorage(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY)
}

// Puts a value in localStorage before the app's scripts run, on the first
// load only, so a later reload sees what the app saved rather than the seed.
async function seedStorage(page: Page, value: string) {
  await page.addInitScript(
    ([key, raw]) => {
      if (sessionStorage.getItem('tasklet-e2e:seeded') === null) {
        localStorage.setItem(key, raw)
        sessionStorage.setItem('tasklet-e2e:seeded', 'yes')
      }
    },
    [STORAGE_KEY, value],
  )
}

function trackTaskRequests(page: Page) {
  const urls: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/tasks.json')) urls.push(request.url())
  })
  return urls
}

// --- Tests ----------------------------------------------------------------

test(T.heading, async ({ page }) => {
  await openLoaded(page)
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasklet')
  const form = page.getByRole('form', { name: 'Add task', exact: true })
  await expect(form.getByRole('textbox', { name: 'New task', exact: true })).toBeVisible()
  await expect(form.getByRole('button', { name: 'Add', exact: true })).toHaveAttribute('type', 'submit')
  const filters = page.getByRole('group', { name: 'Filter', exact: true }).getByRole('button')
  await expect(filters).toHaveText(['All', 'Active', 'Done'])
  await expect(count(page)).toHaveAttribute('aria-live', 'polite')
})

test(T.loading, async ({ page }) => {
  const { opened, release } = gate()
  await page.route('**/tasks.json', async (route) => {
    await opened
    await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveText('Loading tasks…')
  await expect(taskList(page)).toBeHidden()
  await expect(count(page)).toBeHidden()
  await expect(errorAlert(page)).toBeHidden()

  release()
  await expectTasks(page, SEED_VIEW)
  await expect(loadingStatus(page)).toBeHidden()
  await expect(count(page)).toHaveText('2 tasks left')
})

test(T.error, async ({ page }) => {
  const { opened, release } = gate()
  let calls = 0
  await page.route('**/tasks.json', async (route) => {
    calls += 1
    if (calls === 1) {
      await route.fulfill({ status: 500, body: 'Server error' })
      return
    }
    await opened
    await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toHaveText("Couldn't load tasks.")
  await expect(retryButton(page)).toBeVisible()
  await expect(retryButton(page)).toHaveAttribute('type', 'button')
  await expect(loadingStatus(page)).toBeHidden()
  await expect(taskList(page)).toBeHidden()
  await expect(count(page)).toBeHidden()

  // Retry shows the loading state again, then the tasks.
  await retryButton(page).click()
  await expect(loadingStatus(page)).toBeVisible()
  await expect(errorAlert(page)).toBeHidden()
  release()
  await expectTasks(page, SEED_VIEW)
  await expect(retryButton(page)).toBeHidden()
  await expect(count(page)).toHaveText('2 tasks left')
  expect(calls).toBe(2)
})

test(T.networkError, async ({ page }) => {
  let calls = 0
  await page.route('**/tasks.json', async (route) => {
    calls += 1
    if (calls === 1) await route.abort('failed')
    else await route.continue()
  })
  await page.goto('/')
  await expect(errorAlert(page)).toBeVisible()
  await retryButton(page).click()
  await expectTasks(page, SEED_VIEW)
  await expect(errorAlert(page)).toBeHidden()
})

test(T.add, async ({ page }) => {
  await openLoaded(page)
  await newTask(page).fill('  Learn Qwik  ')
  await addButton(page).click()
  await expectTasks(page, [...SEED_VIEW, ['Learn Qwik', false]])
  await expect(items(page).nth(3).locator('span')).toHaveJSProperty('textContent', 'Learn Qwik')
  await expect(newTask(page)).toHaveValue('')
  await expect(count(page)).toHaveText('3 tasks left')

  // Enter submits too; a blank title adds nothing.
  await newTask(page).fill('   ')
  await newTask(page).press('Enter')
  await newTask(page).fill('Try Lit')
  await newTask(page).press('Enter')
  await expectTasks(page, [...SEED_VIEW, ['Learn Qwik', false], ['Try Lit', false]])
  await expect(newTask(page)).toHaveValue('')
  await expect(count(page)).toHaveText('4 tasks left')
})

test(T.toggle, async ({ page }) => {
  await openLoaded(page)
  await checkbox(page, 'Read the Vue chapter').click()
  await expectTasks(page, [
    ['Read the Vue chapter', true],
    ['Try Svelte runes', false],
    ['Write a signal from scratch', true],
  ])
  await expect(count(page)).toHaveText('1 task left')

  // The label wraps the checkbox, so clicking the title toggles it too.
  await items(page).nth(2).getByText('Write a signal from scratch', { exact: true }).click()
  await checkbox(page, 'Read the Vue chapter').click()
  await expectTasks(page, [
    ['Read the Vue chapter', false],
    ['Try Svelte runes', false],
    ['Write a signal from scratch', false],
  ])
  await expect(count(page)).toHaveText('3 tasks left')
})

test(T.remove, async ({ page }) => {
  await openLoaded(page)
  await deleteButton(page, 'Try Svelte runes').click()
  await expectTasks(page, [
    ['Read the Vue chapter', false],
    ['Write a signal from scratch', true],
  ])
  await expect(count(page)).toHaveText('1 task left')
  await deleteButton(page, 'Write a signal from scratch').click()
  await expectTasks(page, [['Read the Vue chapter', false]])
  await expect(count(page)).toHaveText('1 task left')
})

test(T.filter, async ({ page }) => {
  await openLoaded(page)
  const pressed = async (current: 'All' | 'Active' | 'Done') => {
    for (const name of ['All', 'Active', 'Done'] as const) {
      await expect(filterButton(page, name)).toHaveAttribute('aria-pressed', String(name === current))
    }
  }
  await pressed('All')

  await filterButton(page, 'Active').click()
  await pressed('Active')
  await expectTasks(page, [
    ['Read the Vue chapter', false],
    ['Try Svelte runes', false],
  ])
  await expect(count(page)).toHaveText('2 tasks left')

  // Completing a task in the Active view removes it from the view.
  await checkbox(page, 'Try Svelte runes').click()
  await expectTasks(page, [['Read the Vue chapter', false]])

  await filterButton(page, 'Done').click()
  await pressed('Done')
  await expectTasks(page, [
    ['Try Svelte runes', true],
    ['Write a signal from scratch', true],
  ])
  await expect(count(page)).toHaveText('1 task left')

  await filterButton(page, 'All').click()
  await pressed('All')
  await expectTasks(page, [
    ['Read the Vue chapter', false],
    ['Try Svelte runes', true],
    ['Write a signal from scratch', true],
  ])
})

test(T.empty, async ({ page }) => {
  await openLoaded(page)
  await expect(emptyMessage(page)).toBeHidden()
  await filterButton(page, 'Done').click()
  await checkbox(page, 'Write a signal from scratch').click()
  await expect(emptyMessage(page)).toBeVisible()
  await expect(emptyMessage(page)).toContainClass('empty')
  await expect(taskList(page)).toBeHidden()
  await expect(count(page)).toHaveText('3 tasks left')

  await filterButton(page, 'All').click()
  await expect(emptyMessage(page)).toBeHidden()
  for (const title of ['Read the Vue chapter', 'Try Svelte runes', 'Write a signal from scratch']) {
    await deleteButton(page, title).click()
  }
  await expect(emptyMessage(page)).toBeVisible()
  await expect(taskList(page)).toBeHidden()
  await expect(count(page)).toHaveText('0 tasks left')
})

test(T.count, async ({ page }) => {
  await openLoaded(page)
  await expect(count(page)).toHaveText('2 tasks left')
  await checkbox(page, 'Read the Vue chapter').click()
  await expect(count(page)).toHaveText('1 task left')
  await checkbox(page, 'Try Svelte runes').click()
  await expect(count(page)).toHaveText('0 tasks left')
  await checkbox(page, 'Write a signal from scratch').click()
  await expect(count(page)).toHaveText('1 task left')
})

test(T.clear, async ({ page }) => {
  await openLoaded(page)
  await expect(clearDone(page)).toBeEnabled()
  await expect(clearDone(page)).toHaveAttribute('type', 'button')
  await clearDone(page).click()
  await expectTasks(page, [
    ['Read the Vue chapter', false],
    ['Try Svelte runes', false],
  ])
  await expect(clearDone(page)).toBeDisabled()
  await expect(count(page)).toHaveText('2 tasks left')

  await checkbox(page, 'Read the Vue chapter').click()
  await checkbox(page, 'Try Svelte runes').click()
  await expect(clearDone(page)).toBeEnabled()
  await clearDone(page).click()
  await expect(emptyMessage(page)).toBeVisible()
  await expect(count(page)).toHaveText('0 tasks left')
  await expect(clearDone(page)).toBeDisabled()
})

test(T.saves, async ({ page }) => {
  await openLoaded(page)
  // The tasks from the initial fetch are saved too.
  await expect.poll(() => readStorage(page)).toEqual(SEED)

  await newTask(page).fill('Learn Qwik')
  await newTask(page).press('Enter')
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  await expect
    .poll(() => readStorage(page))
    .toEqual([...SEED, { id: expect.stringMatching(uuid), title: 'Learn Qwik', done: false }])
  const added = (await readStorage(page))[3]

  await checkbox(page, 'Read the Vue chapter').click()
  await expect.poll(() => readStorage(page)).toEqual([{ ...SEED[0], done: true }, SEED[1], SEED[2], added])

  await deleteButton(page, 'Try Svelte runes').click()
  await expect.poll(() => readStorage(page)).toEqual([{ ...SEED[0], done: true }, SEED[2], added])

  await clearDone(page).click()
  await expect.poll(() => readStorage(page)).toEqual([added])
})

test(T.restores, async ({ page }) => {
  const saved = [
    { id: 'a', title: 'Saved task', done: false },
    { id: 'b', title: 'Another saved task', done: true },
  ]
  await seedStorage(page, JSON.stringify(saved))
  const requests = trackTaskRequests(page)
  await page.goto('/')
  await expectTasks(page, [
    ['Saved task', false],
    ['Another saved task', true],
  ])
  await expect(count(page)).toHaveText('1 task left')
  await page.waitForLoadState('networkidle')
  expect(requests, 'tasks.json must not be requested when storage holds tasks').toEqual([])

  // An empty saved list is still a saved list: no fetch after a reload.
  await deleteButton(page, 'Saved task').click()
  await deleteButton(page, 'Another saved task').click()
  await expect(emptyMessage(page)).toBeVisible()
  await expect.poll(() => readStorage(page)).toEqual([])
  await page.reload()
  await expect(count(page)).toHaveText('0 tasks left')
  await expect(emptyMessage(page)).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(requests).toEqual([])
})

test(T.invalid, async ({ page }) => {
  await seedStorage(page, '{ not json')
  const requests = trackTaskRequests(page)
  await page.goto('/')
  await expectTasks(page, SEED_VIEW)
  expect(requests).toHaveLength(1)
})

test(T.reload, async ({ page }) => {
  await openLoaded(page)
  await newTask(page).fill('Persist me')
  await addButton(page).click()
  await checkbox(page, 'Read the Vue chapter').click()
  await deleteButton(page, 'Try Svelte runes').click()
  const after: Expected[] = [
    ['Read the Vue chapter', true],
    ['Write a signal from scratch', true],
    ['Persist me', false],
  ]
  await expectTasks(page, after)
  await filterButton(page, 'Done').click()
  await expect(items(page)).toHaveCount(2)

  await page.reload()
  await expectTasks(page, after)
  await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  await expect(count(page)).toHaveText('1 task left')
})
