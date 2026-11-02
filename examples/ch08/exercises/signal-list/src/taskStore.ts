import { createEffect, createResource, createSignal } from 'solid-js';
import { fetchTasks, loadSavedTasks, saveTasks } from './storage';
import type { Task } from './tasks';

export function createTaskStore() {
  const saved = loadSavedTasks();

  // A signal holding an immutable array: every change replaces the array.
  const [tasks, setTasks] = createSignal<Task[]>(saved ?? []);

  const [seed, { refetch }] = createResource(saved === null, async () => {
    setTasks(await fetchTasks());
    return true;
  });

  const ready = () => saved !== null || seed.state === 'ready';

  createEffect(() => {
    if (ready()) saveTasks(tasks());
  });

  return {
    get tasks() {
      return tasks();
    },
    ready,
    loading: () => seed.loading,
    failed: () => seed.state === 'errored',
    retry: () => refetch(),
    add(title: string) {
      setTasks((list) => [...list, { id: crypto.randomUUID(), title, done: false }]);
    },
    toggle(id: string) {
      setTasks((list) => list.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
    },
    remove(id: string) {
      setTasks((list) => list.filter((task) => task.id !== id));
    },
    clearDone() {
      setTasks((list) => list.filter((task) => !task.done));
    },
  };
}
