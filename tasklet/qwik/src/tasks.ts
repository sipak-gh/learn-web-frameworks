export interface Task {
  id: string;
  title: string;
  done: boolean;
}

export type Filter = "all" | "active" | "done";

export function isTaskList(value: unknown): value is Task[] {
  return (
    Array.isArray(value) &&
    value.every(
      (task) =>
        typeof task?.id === "string" &&
        typeof task?.title === "string" &&
        typeof task?.done === "boolean",
    )
  );
}

export function addTask(tasks: Task[], title: string): Task[] {
  return [...tasks, { id: crypto.randomUUID(), title, done: false }];
}

export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task,
  );
}

export function removeTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function clearDone(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.done);
}

export function visibleTasks(tasks: Task[], filter: Filter): Task[] {
  if (filter === "active") return tasks.filter((task) => !task.done);
  if (filter === "done") return tasks.filter((task) => task.done);
  return tasks;
}

export function countLabel(tasks: Task[]): string {
  const left = tasks.filter((task) => !task.done).length;
  return `${left} ${left === 1 ? "task" : "tasks"} left`;
}
