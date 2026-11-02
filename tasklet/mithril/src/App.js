import m from 'mithril'
import { FilterBar } from './components/FilterBar.js'
import { TaskForm } from './components/TaskForm.js'
import { TaskItem } from './components/TaskItem.js'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.js'
import { countLabel, visibleTasks } from './tasks.js'

// A closure component: App() runs once, its local variables are the state,
// and view() reads them again on every redraw. Mithril redraws after every
// event handler in a view and after m.request settles, so the handlers just
// assign to variables.
export function App() {
  let tasks = loadSavedTasks() // null until loaded
  let failed = false
  let filter = 'all'

  // Every change to the list goes through here, so every change is saved.
  function setTasks(next) {
    tasks = next
    saveTasks(tasks)
  }

  function load() {
    failed = false
    fetchTasks().then(setTasks, () => {
      failed = true
    })
  }

  function content() {
    if (failed) {
      return [
        m('p', { role: 'alert' }, "Couldn't load tasks."),
        m('button', { type: 'button', onclick: load }, 'Retry'),
      ]
    }
    if (tasks === null) return m('p', { role: 'status' }, 'Loading tasks…')

    const visible = visibleTasks(tasks, filter)
    if (visible.length === 0) return m('p.empty', 'Nothing to show.')
    return m(
      'ul.tasks',
      { 'aria-label': 'Tasks' },
      visible.map((task) =>
        m(TaskItem, {
          key: task.id,
          task,
          onToggle: () => setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))),
          onRemove: () => setTasks(tasks.filter((t) => t.id !== task.id)),
        }),
      ),
    )
  }

  return {
    oninit() {
      if (tasks === null) load()
    },
    view: () =>
      m(
        'main.tasklet',
        m('h1', 'Tasklet'),
        m(TaskForm, {
          onAdd: (title) => setTasks([...(tasks ?? []), { id: crypto.randomUUID(), title, done: false }]),
        }),
        m(FilterBar, { filter, onChange: (next) => (filter = next) }),
        content(),
        tasks !== null &&
          m(
            'footer.footer',
            m('p.count', { 'aria-live': 'polite' }, countLabel(tasks)),
            m(
              'button.clear',
              {
                type: 'button',
                disabled: !tasks.some((task) => task.done),
                onclick: () => setTasks(tasks.filter((task) => !task.done)),
              },
              'Clear done',
            ),
          ),
      ),
  }
}
