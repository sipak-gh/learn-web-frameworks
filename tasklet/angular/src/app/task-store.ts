import { httpResource } from '@angular/common/http';
import { computed, effect, linkedSignal, Service } from '@angular/core';
import { loadSavedTasks, parseTaskList, saveTasks } from './storage';
import type { Task } from './tasks';

@Service()
export class TaskStore {
  private readonly saved = loadSavedTasks();

  // GET ./tasks.json only when nothing valid was saved. Returning undefined
  // keeps the resource idle, so it never sends a request.
  private readonly seed = httpResource(() => (this.saved ? undefined : './tasks.json'), {
    parse: parseTaskList,
  });

  // The task list: the saved one, else the fetched one (null until it arrives).
  // A linkedSignal is writable, so add/toggle/remove can set it locally.
  readonly tasks = linkedSignal<Task[] | null>(
    () => this.saved ?? (this.seed.hasValue() ? this.seed.value() : null),
  );
  readonly loading = this.seed.isLoading;
  readonly failed = computed(() => this.seed.status() === 'error');

  constructor() {
    // Sync the list to localStorage after every change.
    effect(() => {
      const tasks = this.tasks();
      if (tasks) saveTasks(tasks);
    });
  }

  retry(): void {
    this.seed.reload();
  }

  add(title: string): void {
    this.tasks.update((tasks) => [
      ...(tasks ?? []),
      { id: crypto.randomUUID(), title, done: false },
    ]);
  }

  toggle(id: string): void {
    this.tasks.update(
      (tasks) =>
        tasks && tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  remove(id: string): void {
    this.tasks.update((tasks) => tasks && tasks.filter((task) => task.id !== id));
  }

  clearDone(): void {
    this.tasks.update((tasks) => tasks && tasks.filter((task) => !task.done));
  }
}
