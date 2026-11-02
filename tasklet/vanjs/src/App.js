import van from 'vanjs-core'
import * as vanX from 'vanjs-ext'
import { FilterBar } from './components/FilterBar.js'
import { TaskForm } from './components/TaskForm.js'
import { TaskItem } from './components/TaskItem.js'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.js'
import { countLabel, matchesFilter } from './tasks.js'

const { button, footer, h1, main, p, ul } = van.tags

// App runs once and returns real DOM elements. States are bound to the
// properties and text that read them; nothing re-renders as a whole.
export function App() {
  const saved = loadSavedTasks()
  const tasks = vanX.reactive(saved ?? []) // every task field becomes a state
  const status = van.state(saved ? 'ready' : 'loading') // 'loading' | 'error' | 'ready'
  const filter = van.state('all')

  const visibleCount = van.derive(
    () => tasks.filter((task) => matchesFilter(task, filter.val)).length,
  )

  // A derive whose result is ignored is an effect: save after every change.
  van.derive(() => {
    const list = vanX.compact(tasks) // reads every task, removes holes
    if (status.val === 'ready') saveTasks(list)
  })

  async function load() {
    status.val = 'loading'
    try {
      vanX.replace(tasks, await fetchTasks())
      status.val = 'ready'
    } catch {
      status.val = 'error'
    }
  }

  if (!saved) load()

  // vanX.list creates one <li> per task, adds and removes <li>s as tasks
  // come and go, and never rebuilds the others.
  const list = vanX.list(
    ul({
      class: 'tasks',
      'aria-label': 'Tasks',
      hidden: () => status.val !== 'ready' || visibleCount.val === 0,
    }),
    tasks,
    ({ val: task }, deleter) =>
      TaskItem({
        task,
        hidden: () => !matchesFilter(task, filter.val),
        onToggle: () => (task.done = !task.done),
        onRemove: deleter,
      }),
  )

  return main(
    { class: 'tasklet' },
    h1('Tasklet'),
    TaskForm({
      onAdd: (title) => tasks.push({ id: crypto.randomUUID(), title, done: false }),
    }),
    FilterBar({ filter, onChange: (next) => (filter.val = next) }),
    p({ role: 'status', hidden: () => status.val !== 'loading' }, 'Loading tasks…'),
    p({ role: 'alert', hidden: () => status.val !== 'error' }, "Couldn't load tasks."),
    button({ type: 'button', hidden: () => status.val !== 'error', onclick: load }, 'Retry'),
    list,
    p(
      { class: 'empty', hidden: () => status.val !== 'ready' || visibleCount.val > 0 },
      'Nothing to show.',
    ),
    footer(
      { class: 'footer', hidden: () => status.val !== 'ready' },
      p({ class: 'count', 'aria-live': 'polite' }, () => countLabel(tasks)),
      button(
        {
          type: 'button',
          class: 'clear',
          disabled: () => !tasks.some((task) => task.done),
          onclick: () => vanX.replace(tasks, (list) => list.filter((task) => !task.done)),
        },
        'Clear done',
      ),
    ),
  )
}
