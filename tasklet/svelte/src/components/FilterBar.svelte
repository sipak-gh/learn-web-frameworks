<script lang="ts">
  import type { Filter } from '../tasks.ts'

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
  ]

  // $bindable: the parent may write <FilterBar bind:filter />.
  let { filter = $bindable() }: { filter: Filter } = $props()
</script>

<div role="group" aria-label="Filter" class="filters">
  {#each FILTERS as { value, label } (value)}
    <button type="button" aria-pressed={value === filter} onclick={() => (filter = value)}>
      {label}
    </button>
  {/each}
</div>
