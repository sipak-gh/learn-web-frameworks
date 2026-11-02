import { el } from './dom.ts'
import type { Filter } from './tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

export interface FilterBar {
  element: HTMLDivElement
  update(current: Filter): void
}

// The All / Active / Done buttons. Calls onChange with the clicked filter;
// update() marks the current one as pressed.
export function createFilterBar(onChange: (filter: Filter) => void): FilterBar {
  const buttons = FILTERS.map(({ value, label }) => {
    const button = el('button', { type: 'button' }, label)
    button.addEventListener('click', () => onChange(value))
    return button
  })
  const element = el('div', { className: 'filters', role: 'group', ariaLabel: 'Filter' }, ...buttons)

  function update(current: Filter) {
    buttons.forEach((button, i) => {
      button.ariaPressed = String(FILTERS[i].value === current)
    })
  }

  return { element, update }
}
