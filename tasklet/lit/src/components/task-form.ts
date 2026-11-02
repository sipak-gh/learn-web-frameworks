import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

// The "Add task" form. Fires task-add with the trimmed title; ignores blanks.
@customElement('task-form')
export class TaskForm extends LitElement {
  @state() private draft = ''

  // Render into the element itself (light DOM) instead of a shadow root.
  protected createRenderRoot() {
    return this
  }

  private handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = this.draft.trim()
    if (trimmed === '') return
    this.dispatchEvent(new CustomEvent('task-add', { detail: trimmed }))
    this.draft = ''
  }

  render() {
    return html`
      <form class="add" aria-label="Add task" @submit=${this.handleSubmit}>
        <label for="new-task">New task</label>
        <input
          id="new-task"
          name="title"
          autocomplete="off"
          .value=${this.draft}
          @input=${(event: InputEvent) => (this.draft = (event.target as HTMLInputElement).value)}
        />
        <button type="submit">Add</button>
      </form>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'task-form': TaskForm
  }
}
