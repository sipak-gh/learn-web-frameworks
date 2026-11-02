import { component$, type QRL } from "@builder.io/qwik";
import type { Filter } from "../tasks";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
];

interface FilterBarProps {
  filter: Filter;
  onChange$: QRL<(filter: Filter) => void>;
}

// The All / Active / Done buttons.
export const FilterBar = component$<FilterBarProps>(({ filter, onChange$ }) => (
  <div class="filters" role="group" aria-label="Filter">
    {FILTERS.map(({ value, label }) => (
      <button
        key={value}
        type="button"
        aria-pressed={value === filter ? "true" : "false"}
        onClick$={() => onChange$(value)}
      >
        {label}
      </button>
    ))}
  </div>
));
