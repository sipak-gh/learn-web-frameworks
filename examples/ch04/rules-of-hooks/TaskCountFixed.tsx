import { countLabel, type Task } from '../../../tasklet/react/src/tasks.ts'

// The fix: no hooks at all, because the label is derived from the tasks.
export function TaskCount({ tasks }: { tasks: Task[] | null }) {
  if (tasks === null) return <p>Loading…</p>
  return <p className="count">{countLabel(tasks)}</p>
}
