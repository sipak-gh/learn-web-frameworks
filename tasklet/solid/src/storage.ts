import { isTaskList, type Task } from './tasks';

const STORAGE_KEY = 'tasklet:v1';

// The saved list, or null if there is none or it isn't a valid task list.
export function loadSavedTasks(): Task[] | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isTaskList(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('./tasks.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isTaskList(data)) throw new Error('tasks.json is not a task list');
  return data;
}
