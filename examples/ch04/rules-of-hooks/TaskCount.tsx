import { useEffect, useState } from 'react'
import { countLabel, type Task } from '../../../tasklet/react/src/tasks.ts'

// Breaks the Rules of Hooks on purpose: run oxlint on this file.
export function TaskCount({ tasks }: { tasks: Task[] | null }) {
  if (tasks === null) return <p>Loading…</p>

  const [label, setLabel] = useState('')
  useEffect(() => {
    setLabel(countLabel(tasks))
  }, [tasks])

  return <p className="count">{label}</p>
}
