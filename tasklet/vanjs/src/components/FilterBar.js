import van from 'vanjs-core'

const { button, div } = van.tags

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// The All / Active / Done buttons. `filter` is a state the bar only reads;
// clicks are reported through onChange.
export function FilterBar({ filter, onChange }) {
  return div(
    { class: 'filters', role: 'group', 'aria-label': 'Filter' },
    FILTERS.map(({ value, label }) =>
      button(
        {
          type: 'button',
          'aria-pressed': () => String(filter.val === value),
          onclick: () => onChange(value),
        },
        label,
      ),
    ),
  )
}
