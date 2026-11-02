import { countRender } from '../render-count.ts'
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

interface FilterBarProps {
  filter: Filter
  onChange: (filter: Filter) => void
}

export function FilterBar({ filter, onChange }: FilterBarProps) {
  countRender('FilterBar')
  return (
    <div role="group" aria-label="Filter" className="filters">
      {FILTERS.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={value === filter} onClick={() => onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  )
}
