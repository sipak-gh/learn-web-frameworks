// A stand-in API shared by the router examples.
export interface Task {
  id: string
  title: string
  done: boolean
}

export type Filter = 'all' | 'active' | 'done'

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('/tasks.json')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export async function fetchTask(id: string): Promise<Task | undefined> {
  return (await fetchTasks()).find((task) => task.id === id)
}
