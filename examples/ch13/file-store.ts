// Exercise 3: keep the tasks in a JSON file so they survive a restart.
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { isTaskList, type Task } from '../../tasklet/htmx/src/tasks.ts'

// The saved list, or null if the file is missing or not a valid task list.
export function loadTasks(file: string): Task[] | null {
  try {
    const data: unknown = JSON.parse(readFileSync(file, 'utf8'))
    return isTaskList(data) ? data : null
  } catch {
    return null
  }
}

// Write to a temporary file, then rename it over the old one: a rename is
// atomic, so a crash mid-write never leaves half a JSON file behind.
export function saveTasks(file: string, tasks: Task[]): void {
  const temporary = `${file}.tmp`
  writeFileSync(temporary, JSON.stringify(tasks, null, 2))
  renameSync(temporary, file)
}
