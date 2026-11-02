<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Task } from '../tasks.ts'

  interface Props {
    tasks: Task[]
    item: Snippet<[Task]>
    empty?: Snippet
  }

  let { tasks, item, empty }: Props = $props()
</script>

{#if tasks.length === 0}
  {#if empty}{@render empty()}{:else}<p class="empty">Nothing to show.</p>{/if}
{:else}
  <ul class="tasks" aria-label="Tasks">
    {#each tasks as task (task.id)}
      {@render item(task)}
    {/each}
  </ul>
{/if}
