import { component$, type QRL } from "@builder.io/qwik";
import type { Task } from "../tasks";

interface TaskItemProps {
  task: Task;
  onToggle$: QRL<() => void>;
  onRemove$: QRL<() => void>;
}

// One task: a checkbox wrapped in its label, and a Delete button.
export const TaskItem = component$<TaskItemProps>(
  ({ task, onToggle$, onRemove$ }) => (
    <li class={task.done ? "task done" : "task"}>
      <label>
        <input type="checkbox" checked={task.done} onChange$={onToggle$} />{" "}
        <span>{task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label={`Delete "${task.title}"`}
        onClick$={onRemove$}
      >
        ×
      </button>
    </li>
  ),
);
