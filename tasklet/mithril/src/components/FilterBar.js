import m from 'mithril'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// The All / Active / Done buttons. Stateless: an object with a view method.
export const FilterBar = {
  view: ({ attrs: { filter, onChange } }) =>
    m(
      'div.filters[role=group]',
      { 'aria-label': 'Filter' },
      FILTERS.map(({ value, label }) =>
        m(
          'button',
          {
            type: 'button',
            'aria-pressed': String(value === filter),
            onclick: () => onChange(value),
          },
          label,
        ),
      ),
    ),
}
