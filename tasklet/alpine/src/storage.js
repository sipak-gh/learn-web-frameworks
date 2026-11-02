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

export async function fetchTasks() {
  const response = await fetch('./tasks.json')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (!isTaskList(data)) throw new Error('tasks.json is not a task list')
  return data
}
