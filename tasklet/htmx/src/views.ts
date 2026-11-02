// The views: one function per piece of the page, in place of the components
// of the other chapters. The full page uses them all; the fragments that
// answer htmx requests reuse the same functions, so the markup never differs.
import { html, type Html } from './html.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// Marks an element for an out-of-band swap: htmx puts it in place of the
// element with the same id, wherever that is on the page.
const oobAttr = (oob: boolean, swap = 'true') => (oob ? html` hx-swap-oob="${swap}"` : null)

export function page(tasks: Task[], filter: Filter): Html {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasklet — htmx</title>
    <link rel="stylesheet" href="/tasklet.css">
    <script src="/htmx.min.js"></script>
  </head>
  <body>
    <main class="tasklet">
      <h1>Tasklet</h1>
      ${taskForm()}
      ${filterBar(filter)}
      <div id="task-list">
        ${taskList(tasks, filter)}
      </div>
      <footer class="footer">
        ${count(tasks)}
        ${clearButton(tasks)}
      </footer>
    </main>
  </body>
</html>
`
}

// Without JavaScript the form posts to /tasks and the server redirects back
// to the page. With htmx it posts in the background and swaps the list; the
// form is reset once htmx has collected its values (htmx:config-request).
export function taskForm(): Html {
  return html`<form aria-label="Add task" class="add" method="post" action="/tasks"
        hx-post="/tasks" hx-include="#current-filter" hx-target="#task-list" hx-swap="innerHTML"
        hx-on::config-request="this.reset()">
        <label for="new-task">New task</label>
        <input id="new-task" name="title" autocomplete="off">
        <button type="submit">Add</button>
      </form>`
}

// The current filter lives in the page itself, in a hidden input that the
// other requests include, so the server renders the list they expect.
export function filterBar(current: Filter, oob = false): Html {
  return html`<div role="group" aria-label="Filter" class="filters" id="filters"${oobAttr(oob)}>
        <input type="hidden" id="current-filter" name="filter" value="${current}">${FILTERS.map(
          ({ value, label }) => html`
        <button type="button" id="filter-${value}" aria-pressed="${value === current}"
          hx-get="/?filter=${value}" hx-target="#task-list" hx-swap="innerHTML">${label}</button>`,
        )}
      </div>`
}

// What goes inside <div id="task-list">, the target of every request. The div
// itself is never replaced, so a response still finds it even when another
// response has just swapped its contents.
export function taskList(tasks: Task[], filter: Filter): Html {
  const visible = visibleTasks(tasks, filter)
  if (visible.length === 0) return html`<p class="empty">Nothing to show.</p>`
  return html`<ul class="tasks" aria-label="Tasks">${visible.map(taskItem)}
        </ul>`
}

export function taskItem(task: Task): Html {
  const path = `/tasks/${encodeURIComponent(task.id)}`
  return html`
          <li class="${task.done ? 'task done' : 'task'}">
            <label><input type="checkbox" id="toggle-${task.id}"${task.done ? html` checked` : null}
              hx-post="${path}/toggle" hx-trigger="change" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML"> <span>${task.title}</span></label>
            <button type="button" class="delete" aria-label="${`Delete "${task.title}"`}"
              hx-delete="${path}" hx-include="#current-filter"
              hx-target="#task-list" hx-swap="innerHTML">×</button>
          </li>`
}

// The live region stays in the page; out-of-band swaps replace only its text.
export function count(tasks: Task[], oob = false): Html {
  return html`<p class="count" id="count" aria-live="polite"${oobAttr(oob, 'innerHTML')}>${countLabel(tasks)}</p>`
}

export function clearButton(tasks: Task[], oob = false): Html {
  const noneDone = !tasks.some((task) => task.done)
  return html`<button type="button" class="clear" id="clear-done"${noneDone ? html` disabled` : null}${oobAttr(oob)}
          hx-post="/tasks/clear-done" hx-include="#current-filter"
          hx-target="#task-list" hx-swap="innerHTML">Clear done</button>`
}

// The answer to every change: the list, plus the count and Clear done out of band.
export function afterChange(tasks: Task[], filter: Filter): Html {
  return html`${taskList(tasks, filter)}
${count(tasks, true)}
${clearButton(tasks, true)}
`
}

// The answer to a filter button: the list, plus the filter bar out of band.
export function afterFilter(tasks: Task[], filter: Filter): Html {
  return html`${taskList(tasks, filter)}
${filterBar(filter, true)}
`
}
