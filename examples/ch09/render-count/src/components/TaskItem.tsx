import type { Task } from '../tasks.ts'

interface TaskItemProps {
  task: Task
  onToggle: () => void
  onRemove: () => void
}

export function TaskItem({ task, onToggle, onRemove }: TaskItemProps) {
  return (
    <li class={task.done ? 'task done' : 'task'}>
      <label>
        <input type="checkbox" checked={task.done} onChange={onToggle} /> <span>{task.title}</span>
      </label>
      <button type="button" class="delete" aria-label={`Delete "${task.title}"`} onClick={onRemove}>
        ×
      </button>
    </li>
  )
}
