import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.html',
})
export class TaskForm {
  readonly add = output<string>();

  protected readonly title = signal('');

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const title = this.title().trim();
    if (title === '') return;
    this.add.emit(title);
    this.title.set('');
  }
}
