import type { ReadonlySignal } from '@preact/signals'
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

interface FilterBarProps {
  filter: ReadonlySignal<Filter>
  onChange: (filter: Filter) => void
}

// Reads filter.value, so FilterBar (and only FilterBar) re-renders when the filter changes.
export function FilterBar({ filter, onChange }: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter" class="filters">
      {FILTERS.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={value === filter.value} onClick={() => onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  )
}
