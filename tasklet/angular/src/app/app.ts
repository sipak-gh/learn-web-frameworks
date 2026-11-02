import { Component, computed, inject, signal } from '@angular/core';
import { FilterBar } from './filter-bar/filter-bar';
import { TaskForm } from './task-form/task-form';
import { TaskItem } from './task-item/task-item';
import { TaskStore } from './task-store';
import { countLabel, visibleTasks, type Filter } from './tasks';

@Component({
  imports: [FilterBar, TaskForm, TaskItem],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(TaskStore);
  protected readonly filter = signal<Filter>('all');

  protected readonly visible = computed(() =>
    visibleTasks(this.store.tasks() ?? [], this.filter()),
  );
  protected readonly countLabel = computed(() => countLabel(this.store.tasks() ?? []));
  protected readonly anyDone = computed(
    () => this.store.tasks()?.some((task) => task.done) ?? false,
  );
}
