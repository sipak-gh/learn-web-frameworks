import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Task } from '../tasks.ts'

// One task's contents: a checkbox wrapped in its label, and a Delete button.
// The parent wraps it in the <li>, since a <ul> may only contain <li> elements.
// Fires task-toggle and task-remove.
@customElement('task-item')
export class TaskItem extends LitElement {
  // An object, so property-only: set it with .task=${task}, not an attribute.
  @property({ attribute: false }) task!: Task

  protected createRenderRoot() {
    return this
  }

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
