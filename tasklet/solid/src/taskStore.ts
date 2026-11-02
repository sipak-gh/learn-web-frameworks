import { createEffect, createResource } from 'solid-js';
import { createStore } from 'solid-js/store';
import { fetchTasks, loadSavedTasks, saveTasks } from './storage';
import type { Task } from './tasks';

export function createTaskStore() {
  const saved = loadSavedTasks();

  // A store, so changing one task updates only the bindings that read that task.
  const [tasks, setTasks] = createStore<Task[]>(saved ?? []);

  // Fetch the seed tasks only when nothing was saved. The resource tracks the
  // request (pending, ready, errored); the store keeps the data.
  const [seed, { refetch }] = createResource(saved === null, async () => {
    setTasks(await fetchTasks());
    return true;
  });

  const ready = () => saved !== null || seed.state === 'ready';

  // JSON.stringify reads every task and field, so the effect tracks them all.
  createEffect(() => {
    if (ready()) saveTasks(tasks);
  });

  return {
    tasks,
    ready,
    loading: () => seed.loading,
    failed: () => seed.state === 'errored',
    retry: () => refetch(),
    add(title: string) {
      setTasks(tasks.length, { id: crypto.randomUUID(), title, done: false });
    },
    toggle(id: string) {
      setTasks((task) => task.id === id, 'done', (done) => !done);
    },
    remove(id: string) {
      setTasks((list) => list.filter((task) => task.id !== id));
    },
    clearDone() {
      setTasks((list) => list.filter((task) => !task.done));
    },
  };
}
