import m from 'mithril'
import { isTaskList } from './tasks.js'

const STORAGE_KEY = 'tasklet:v1'

// The saved list, or null if there is none or it isn't a valid task list.
export function loadSavedTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return isTaskList(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// m.request instead of fetch: Mithril redraws after the promise chain built
// on it settles. It rejects for HTTP errors (status outside 2xx/304) too.
export function fetchTasks() {
  return m.request({ url: './tasks.json' }).then((data) => {
    if (!isTaskList(data)) throw new Error('tasks.json is not a task list')
    return data
  })
}
