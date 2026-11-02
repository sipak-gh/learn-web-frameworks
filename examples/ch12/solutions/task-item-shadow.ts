import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Task } from '../tasks.ts'
import { taskletSheet } from '../styles.ts'

// One task's contents, rendered into its own shadow root (exercise 4 of
// Chapter 12). The parent still wraps it in the <li>.
// Fires task-toggle and task-remove.
@customElement('task-item')
export class TaskItem extends LitElement {
  // An object, so property-only: set it with .task=${task}, not an attribute.
  @property({ attribute: false }) task!: Task

  // Its own shadow root this time, with the shared sheet adopted into it.
  static styles = taskletSheet

  render() {
    const { task } = this
    return html`
      <label>
        <input
          type="checkbox"
          .checked=${task.done}
          @change=${() => this.dispatchEvent(new CustomEvent('task-toggle'))}
        />
        <span>${task.title}</span>
      </label>
      <button
        type="button"
        class="delete"
        aria-label=${`Delete "${task.title}"`}
        @click=${() => this.dispatchEvent(new CustomEvent('task-remove'))}
      >
        ×
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'task-item': TaskItem
  }
}
