// Exercise 4: Tasklet's state in a .svelte.ts module. Any component that imports
// `tasks` shares the same reactive state. Copy to tasklet/svelte/src/.
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import type { Task } from './tasks.ts'

class TaskStore {
  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  list = $state<Task[] | null>(loadSavedTasks())
  failed = $state(false)
  anyDone = $derived(this.list?.some((task) => task.done) ?? false)

  // Arrow functions keep `this` when passed as callbacks: onclick={tasks.load}.
  load = async () => {
    this.failed = false
    try {
      this.list = await fetchTasks()
    } catch {
      this.failed = true
    }
  }

  add = (title: string) => {
    this.list?.push({ id: crypto.randomUUID(), title, done: false })
  }

  remove = (id: string) => {
    this.list = this.list?.filter((task) => task.id !== id) ?? null
  }

  clearDone = () => {
    this.list = this.list?.filter((task) => !task.done) ?? null
  }
}

export const tasks = new TaskStore()

// A module has no component to own its effects, so create a root for them.
$effect.root(() => {
  $effect(() => {
    if (tasks.list !== null) saveTasks(tasks.list)
  })
})
