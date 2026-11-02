import van from 'vanjs-core'

const { button, input, label, li, span } = van.tags

// One task. `task` is a VanX reactive object, so each binding function
// below re-runs only when the field it reads changes. Built once per task.
export function TaskItem({ task, hidden, onToggle, onRemove }) {
  return li(
    { class: () => (task.done ? 'task done' : 'task'), hidden },
    label(
      input({ type: 'checkbox', checked: () => task.done, onchange: onToggle }),
      ' ',
      span(() => task.title),
    ),
    button(
      {
        type: 'button',
        class: 'delete',
        'aria-label': () => `Delete "${task.title}"`,
        onclick: onRemove,
      },
      '×',
    ),
  )
}
