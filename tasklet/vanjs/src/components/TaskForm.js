import van from 'vanjs-core'

const { button, form, input, label } = van.tags

// The "Add task" form. Calls onAdd with the trimmed title; ignores blanks.
export function TaskForm({ onAdd }) {
  const title = van.state('')

  return form(
    {
      class: 'add',
      'aria-label': 'Add task',
      onsubmit: (event) => {
        event.preventDefault()
        const trimmed = title.val.trim()
        if (trimmed === '') return
        onAdd(trimmed)
        title.val = ''
      },
    },
    label({ for: 'new-task' }, 'New task'),
    input({
      id: 'new-task',
      name: 'title',
      autocomplete: 'off',
      value: title,
      oninput: (event) => (title.val = event.target.value),
    }),
    button({ type: 'submit' }, 'Add'),
  )
}
