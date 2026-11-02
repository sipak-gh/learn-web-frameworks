import { Component, computed, input, output } from '@angular/core';
import type { Task } from '../tasks';

// An attribute selector: the <li> itself is the component's host element.
@Component({
  selector: 'li[app-task-item]',
  templateUrl: './task-item.html',
  host: { class: 'task', '[class.done]': 'task().done' },
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly toggle = output();
  readonly remove = output();

  protected readonly deleteLabel = computed(() => `Delete "${this.task().title}"`);
}
