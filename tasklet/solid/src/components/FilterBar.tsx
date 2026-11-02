import { For } from 'solid-js';
import type { Filter } from '../tasks';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

interface FilterBarProps {
  filter: Filter;
  onChange: (filter: Filter) => void;
}

export function FilterBar(props: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter" class="filters">
      <For each={FILTERS}>
        {({ value, label }) => (
          <button type="button" aria-pressed={value === props.filter} onClick={() => props.onChange(value)}>
            {label}
          </button>
        )}
      </For>
    </div>
  );
}
