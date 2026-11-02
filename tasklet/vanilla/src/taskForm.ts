import { el } from './dom.ts'

// The "Add task" form. Calls onAdd with the trimmed title; ignores blanks.
export function createTaskForm(onAdd: (title: string) => void): HTMLFormElement {
  const input = el('input', { id: 'new-task', name: 'title', autocomplete: 'off' })
  const form = el(
    'form',
    { className: 'add', ariaLabel: 'Add task' },
    el('label', { htmlFor: 'new-task' }, 'New task'),
    input,
    el('button', { type: 'submit' }, 'Add'),
  )

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const title = input.value.trim()
    if (title === '') return
    onAdd(title)
    input.value = ''
  })

  return form
}
