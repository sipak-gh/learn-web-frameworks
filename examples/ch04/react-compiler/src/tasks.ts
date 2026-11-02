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

export function visibleTasks(tasks: Task[], filter: Filter): Task[] {
  if (filter === 'active') return tasks.filter((task) => !task.done)
  if (filter === 'done') return tasks.filter((task) => task.done)
  return tasks
}

export function countLabel(tasks: Task[]): string {
  const left = tasks.filter((task) => !task.done).length
  return `${left} ${left === 1 ? 'task' : 'tasks'} left`
}
