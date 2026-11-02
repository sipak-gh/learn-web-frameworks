import m from 'mithril'

// One task. Stateless: it reads everything from attrs on every redraw.
export const TaskItem = {
  view: ({ attrs: { task, onToggle, onRemove } }) =>
    m(
      'li.task',
      { class: task.done ? 'done' : undefined },
      m(
        'label',
        m('input[type=checkbox]', { checked: task.done, onchange: onToggle }),
        ' ',
        m('span', task.title),
      ),
      m(
        'button.delete',
        { type: 'button', 'aria-label': `Delete "${task.title}"`, onclick: onRemove },
        '×',
      ),
    ),
}
