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

/** @param {Task} task @param {Filter} filter */
export function matchesFilter(task, filter) {
  if (filter === 'active') return !task.done
  if (filter === 'done') return task.done
  return true
}

// Uses filter(), which skips the holes that deleting from a VanX reactive
// array leaves behind (so does some()).
/** @param {Task[]} tasks */
export function countLabel(tasks) {
  const left = tasks.filter((task) => !task.done).length
  return `${left} ${left === 1 ? 'task' : 'tasks'} left`
}
