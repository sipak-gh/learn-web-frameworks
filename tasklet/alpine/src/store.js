import { fetchTasks, loadSavedTasks } from './storage.js'
import { countLabel, visibleTasks } from './tasks.js'

// The app's state, shared by every component as $store.tasklet. Alpine wraps
// this object in a reactive proxy, so the methods simply mutate it.
export const tasklet = {
  status: 'loading',
  tasks: [],
  filter: 'all',

  get ready() {
    return this.status === 'ready'
  },
  get visible() {
    return visibleTasks(this.tasks, this.filter)
  },
  get countLabel() {
    return countLabel(this.tasks)
  },
  get hasDone() {
    return this.tasks.some((task) => task.done)
  },

  start() {
    const saved = loadSavedTasks()
    if (saved) {
      this.tasks = saved
      this.status = 'ready'
    } else {
      this.load()
    }
  },
  async load() {
    this.status = 'loading'
    try {
      this.tasks = await fetchTasks()
      this.status = 'ready'
    } catch {
      this.status = 'error'
    }
  },

  add(title) {
    this.tasks.push({ id: crypto.randomUUID(), title, done: false })
  },
  toggle(id) {
    const task = this.tasks.find((task) => task.id === id)
    if (task) task.done = !task.done
  },
  remove(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id)
  },
  clearDone() {
    this.tasks = this.tasks.filter((task) => !task.done)
  },
}
