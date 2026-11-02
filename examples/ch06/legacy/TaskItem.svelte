<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Task } from '../tasks.ts'

  export let task: Task

  const dispatch = createEventDispatcher<{ toggle: null; remove: null }>()

  $: label = `Delete "${task.title}"`
</script>

<li class="task" class:done={task.done}>
  <label>
    <input type="checkbox" checked={task.done} on:change={() => dispatch('toggle')} /> <span>{task.title}</span>
  </label>
  <button type="button" class="delete" aria-label={label} on:click={() => dispatch('remove')}>×</button>
</li>
