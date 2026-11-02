// The data model and the in-memory store. No HTTP and no HTML here.
import { readFileSync } from 'node:fs'

export interface Task {
  id: string
  title: string
  done: boolean
}

export type Filter = 'all' | 'active' | 'done'

export function isTaskList(value: unknown): value is Task[] {
  return (
    Array.isArray(value) &&
    value.every(
      (task) =>
        typeof task?.id === 'string' &&
        typeof task?.title === 'string' &&
        typeof task?.done === 'boolean',
    )
  )
}

export function parseFilter(value: string | null): Filter {
  return value === 'active' || value === 'done' ? value : 'all'
}

export function visibleTasks(tasks: Task[], filter: Filter): Task[] {
  if (filter === 'active') return tasks.filter((task) => !task.done)
  if (filter === 'done') return tasks.filter((task) => task.done)
  return tasks
}

export function countLabel(tasks: Task[]): string {
  const left = tasks.filter((task) => !task.done).length
  return `${left} ${left === 1 ? 'task' : 'tasks'} left`
}

function loadSeed(): Task[] {
  const data: unknown = JSON.parse(readFileSync(new URL('../public/tasks.json', import.meta.url), 'utf8'))
  if (!isTaskList(data)) throw new Error('public/tasks.json is not a task list')
  return data
}

const seed = loadSeed()

// The only copy of the data. It lives as long as the server process.
let tasks: Task[] = structuredClone(seed)

export function allTasks(): Task[] {
  return tasks
}

export function resetTasks(): void {
  tasks = structuredClone(seed)
}

export function addTask(title: string): void {
  tasks.push({ id: crypto.randomUUID(), title, done: false })
}

// toggleTask and removeTask return false when there is no task with that id.
export function toggleTask(id: string): boolean {
  const task = tasks.find((task) => task.id === id)
  if (task) task.done = !task.done
  return task !== undefined
}

export function removeTask(id: string): boolean {
  const before = tasks.length
  tasks = tasks.filter((task) => task.id !== id)
  return tasks.length < before
}

export function clearDone(): void {
  tasks = tasks.filter((task) => !task.done)
}
