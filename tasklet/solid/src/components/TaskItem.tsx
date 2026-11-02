import type { Task } from '../tasks';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
}

export function TaskItem(props: TaskItemProps) {
  return (
    <li class="task" classList={{ done: props.task.done }}>
      <label>
        <input type="checkbox" checked={props.task.done} onChange={props.onToggle} /> <span>{props.task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label={`Delete "${props.task.title}"`}
        onClick={props.onRemove}
      >
        ×
      </button>
    </li>
  );
}
