import { Component, output, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

@Component({
  imports: [FormField, FormRoot],
  selector: 'app-task-form',
  templateUrl: './task-form.html',
})
export class TaskForm {
  readonly add = output<string>();

  private readonly title = signal('');

  // A Signal Form whose model is the title string. [formField] binds it to the
  // input both ways (and sets name="title"); [formRoot] cancels the browser's
  // submit and runs the action.
  protected readonly titleField = form(this.title, {
    name: 'title',
    submission: {
      action: async () => {
        const title = this.title().trim();
        if (title === '') return;
        this.add.emit(title);
        this.title.set('');
      },
    },
  });
}
