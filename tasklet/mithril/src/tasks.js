/** @typedef {{ id: string, title: string, done: boolean }} Task */
/** @typedef {'all' | 'active' | 'done'} Filter */

/** @returns {value is Task[]} */
export function isTaskList(value) {
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

/** @param {Task[]} tasks @param {Filter} filter */
export function visibleTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.done)
  if (filter === 'done') return tasks.filter((task) => task.done)
  return tasks
}

/** @param {Task[]} tasks */
export function countLabel(tasks) {
  const left = tasks.filter((task) => !task.done).length
  return `${left} ${left === 1 ? 'task' : 'tasks'} left`
}
