import { el } from './dom.ts'
import type { Task } from './tasks.ts'

export interface TaskItemHandlers {
  onToggle(id: string): void
  onRemove(id: string): void
}

export interface TaskItem {
  element: HTMLLIElement
  update(task: Task): void
}

// One <li> in the list. update() copies a (possibly changed) task onto the
// existing elements instead of building new ones.
export function createTaskItem(task: Task, { onToggle, onRemove }: TaskItemHandlers): TaskItem {
  const checkbox = el('input', { type: 'checkbox' })
  const title = el('span')
  const remove = el('button', { type: 'button', className: 'delete' }, '×')
  const element = el('li', { className: 'task' }, el('label', {}, checkbox, ' ', title), remove)

  checkbox.addEventListener('change', () => onToggle(task.id))
  remove.addEventListener('click', () => onRemove(task.id))

  function update(next: Task) {
    element.classList.toggle('done', next.done)
    checkbox.checked = next.done
    title.textContent = next.title
    remove.ariaLabel = `Delete "${next.title}"`
  }

  update(task)
  return { element, update }
}
