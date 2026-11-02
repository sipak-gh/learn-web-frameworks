// Exercise 4: a drop-in replacement for tasklet/vanilla/src/app.ts that rebuilds
// the list on every render instead of patching it.
import { el } from './dom.ts'
import { createFilterBar } from './filterBar.ts'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { createTaskForm } from './taskForm.ts'
import { createTaskItem } from './taskItem.ts'
import {
  addTask,
  clearDone,
  countLabel,
  removeTask,
  toggleTask,
  visibleTasks,
  type Filter,
  type Task,
} from './tasks.ts'

interface State {
  status: 'loading' | 'error' | 'ready'
  tasks: Task[]
  filter: Filter
}

// Builds the whole UI once, then keeps it in sync with `state` by hand:
// every change goes through setState(), which saves and calls render().
export function mountApp(root: HTMLElement): void {
  let state: State = { status: 'loading', tasks: [], filter: 'all' }

  function setState(changes: Partial<State>) {
    const tasksChanged = changes.tasks !== undefined && changes.tasks !== state.tasks
    state = { ...state, ...changes }
    if (tasksChanged) saveTasks(state.tasks)
    render()
  }

  // Children: they report what happened, App decides what it means.
  const form = createTaskForm((title) => setState({ tasks: addTask(state.tasks, title) }))
  const filterBar = createFilterBar((filter) => setState({ filter }))
  const itemHandlers = {
    onToggle: (id: string) => setState({ tasks: toggleTask(state.tasks, id) }),
    onRemove: (id: string) => setState({ tasks: removeTask(state.tasks, id) }),
  }

  // Every element that can ever appear, created once. render() shows or
  // hides them and patches their contents.
  const loading = el('p', { role: 'status' }, 'Loading tasks…')
  const error = el('p', { role: 'alert' }, "Couldn't load tasks.")
  const retry = el('button', { type: 'button' }, 'Retry')
  const list = el('ul', { className: 'tasks', ariaLabel: 'Tasks' })
  const empty = el('p', { className: 'empty' }, 'Nothing to show.')
  const count = el('p', { className: 'count', ariaLive: 'polite' })
  const clear = el('button', { type: 'button', className: 'clear' }, 'Clear done')
  const footer = el('footer', { className: 'footer' }, count, clear)

  retry.addEventListener('click', load)
  clear.addEventListener('click', () => setState({ tasks: clearDone(state.tasks) }))

  root.append(
    el(
      'main',
      { className: 'tasklet' },
      el('h1', {}, 'Tasklet'),
      form,
      filterBar.element,
      loading,
      error,
      retry,
      list,
      empty,
      footer,
    ),
  )

  // Throws the old <li> elements away and builds new ones on every render.
  function renderList(tasks: Task[]) {
    list.replaceChildren(...tasks.map((task) => createTaskItem(task, itemHandlers).element))
  }

  function render() {
    const { status, tasks, filter } = state
    const visible = visibleTasks(tasks, filter)
    const ready = status === 'ready'

    filterBar.update(filter)
    loading.hidden = status !== 'loading'
    error.hidden = retry.hidden = status !== 'error'
    list.hidden = !ready || visible.length === 0
    empty.hidden = !ready || visible.length > 0
    footer.hidden = !ready
    renderList(ready ? visible : [])
    count.textContent = countLabel(tasks)
    clear.disabled = !tasks.some((task) => task.done)
  }

  async function load() {
    setState({ status: 'loading' })
    try {
      setState({ status: 'ready', tasks: await fetchTasks() })
    } catch {
      setState({ status: 'error' })
    }
  }

  const saved = loadSavedTasks()
  if (saved) {
    setState({ status: 'ready', tasks: saved })
  } else {
    load()
  }
}
