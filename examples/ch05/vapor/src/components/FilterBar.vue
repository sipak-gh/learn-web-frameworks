<script setup vapor lang="ts">
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// v-model on <FilterBar>: a "modelValue" prop plus an "update:modelValue" event.
const filter = defineModel<Filter>({ required: true })
</script>

<template>
  <div role="group" aria-label="Filter" class="filters">
    <button
      v-for="{ value, label } in FILTERS"
      :key="value"
      type="button"
      :aria-pressed="value === filter"
      @click="filter = value"
    >
      {{ label }}
    </button>
  </div>
</template>
