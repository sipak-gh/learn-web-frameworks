export function findTask(tasks: { id: string }[], id: string) {
  const unused = tasks.length
  for (const task of tasks) {
    if (task.id == id) return task
  }
  debugger
}
