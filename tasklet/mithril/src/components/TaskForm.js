import m from 'mithril'

// The "Add task" form. A closure component: `title` lives as long as the
// form does. Calls onAdd with the trimmed title; ignores blanks.
export function TaskForm() {
  let title = ''

  return {
    view: ({ attrs: { onAdd } }) =>
      m(
        'form.add',
        {
          'aria-label': 'Add task',
          onsubmit(event) {
            event.preventDefault()
            const trimmed = title.trim()
            if (trimmed === '') return
            onAdd(trimmed)
            title = ''
          },
        },
        m('label', { for: 'new-task' }, 'New task'),
        m('input#new-task', {
          name: 'title',
          autocomplete: 'off',
          value: title,
          oninput: (event) => (title = event.target.value),
        }),
        m('button', { type: 'submit' }, 'Add'),
      ),
  }
}
