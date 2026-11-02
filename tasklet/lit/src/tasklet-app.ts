import { Task as AsyncTask } from '@lit/task'
import { LitElement, css, html, nothing, type PropertyValues } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import './components/filter-bar.ts'
import './components/task-form.ts'
import './components/task-item.ts'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'
import { taskletSheet } from './styles.ts'

// The app. It keeps the default shadow root, so the page's CSS can't reach in,
// and adopts the shared stylesheet there. The child elements render into this
// shadow root (they opt out of their own), so one stylesheet styles them all.
@customElement('tasklet-app')
export class TaskletApp extends LitElement {
  static styles = [taskletSheet, css`task-item { display: contents; }`]

  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  @state() private tasks: Task[] | null = loadSavedTasks()
  @state() private filter: Filter = 'all'

  // A reactive controller from @lit/task: tracks pending/complete/error for
  // the fetch and requests an update of this element on every change.
  private loader = new AsyncTask(this, {
    task: () => fetchTasks(),
    autoRun: false,
    onComplete: (tasks) => {
      this.tasks = tasks
    },
  })

  connectedCallback() {
    super.connectedCallback()
    if (this.tasks === null) this.loader.run()
  }

  // Runs after every render; changed says which reactive properties caused it.
  protected updated(changed: PropertyValues) {
    if (changed.has('tasks') && this.tasks !== null) saveTasks(this.tasks)
  }

  private addTask(title: string) {
    this.tasks = [...(this.tasks ?? []), { id: crypto.randomUUID(), title, done: false }]
  }

  private toggleTask(id: string) {
    this.tasks = (this.tasks ?? []).map((task) => (task.id === id ? { ...task, done: !task.done } : task))
  }

  private removeTask(id: string) {
    this.tasks = (this.tasks ?? []).filter((task) => task.id !== id)
  }

  private clearDone() {
    this.tasks = (this.tasks ?? []).filter((task) => !task.done)
  }

  private renderList(tasks: Task[]) {
    const visible = visibleTasks(tasks, this.filter)
    if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
    return html`
      <ul class="tasks" aria-label="Tasks">
        ${repeat(
          visible,
          (task) => task.id,
          (task) => html`
            <li class=${task.done ? 'task done' : 'task'}>
              <task-item
                .task=${task}
                @task-toggle=${() => this.toggleTask(task.id)}
                @task-remove=${() => this.removeTask(task.id)}
              ></task-item>
            </li>
          `,
        )}
      </ul>
    `
  }

  render() {
    const tasks = this.tasks
    return html`
      <main class="tasklet">
        <h1>Tasklet</h1>
        <task-form @task-add=${(event: CustomEvent<string>) => this.addTask(event.detail)}></task-form>
        <filter-bar
          filter=${this.filter}
          @filter-change=${(event: CustomEvent<Filter>) => (this.filter = event.detail)}
        ></filter-bar>
        ${tasks !== null
          ? this.renderList(tasks)
          : this.loader.render({
              initial: () => html`<p role="status">Loading tasks…</p>`,
              pending: () => html`<p role="status">Loading tasks…</p>`,
              error: () => html`
                <p role="alert">Couldn't load tasks.</p>
                <button type="button" @click=${() => this.loader.run()}>Retry</button>
              `,
            })}
        ${tasks === null
          ? nothing
          : html`
              <footer class="footer">
                <p class="count" aria-live="polite">${countLabel(tasks)}</p>
                <button
                  type="button"
                  class="clear"
                  ?disabled=${!tasks.some((task) => task.done)}
                  @click=${this.clearDone}
                >
                  Clear done
                </button>
              </footer>
            `}
      </main>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tasklet-app': TaskletApp
  }
}
