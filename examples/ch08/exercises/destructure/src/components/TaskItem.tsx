import type { Task } from '../tasks';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
}

export function TaskItem(props: TaskItemProps) {
  const { done, title } = props.task;
  return (
    <li class="task" classList={{ done }}>
      <label>
        <input type="checkbox" checked={done} onChange={props.onToggle} /> <span>{title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label={`Delete "${title}"`}
        onClick={props.onRemove}
      >
        ×
      </button>
    </li>
  );
}
