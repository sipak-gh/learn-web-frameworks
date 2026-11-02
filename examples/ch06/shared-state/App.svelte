<script lang="ts">
  import { onMount } from 'svelte'
  import FilterBar from './components/FilterBar.svelte'
  import TaskForm from './components/TaskForm.svelte'
  import TaskItem from './components/TaskItem.svelte'
  import { countLabel, visibleTasks, type Filter } from './tasks.ts'
  import { tasks } from './tasks.svelte.ts'

  let filter = $state<Filter>('all')
  const visible = $derived(visibleTasks(tasks.list ?? [], filter))

  onMount(() => {
    if (tasks.list === null) tasks.load()
  })
</script>

<main class="tasklet">
  <h1>Tasklet</h1>
  <TaskForm onadd={tasks.add} />
  <FilterBar bind:filter />
  {#if tasks.failed}
    <p role="alert">Couldn't load tasks.</p>
    <button type="button" onclick={tasks.load}>Retry</button>
  {:else if tasks.list === null}
    <p role="status">Loading tasks…</p>
  {:else if visible.length === 0}
    <p class="empty">Nothing to show.</p>
  {:else}
    <ul class="tasks" aria-label="Tasks">
      {#each visible as task (task.id)}
        <TaskItem {task} ontoggle={() => (task.done = !task.done)} onremove={() => tasks.remove(task.id)} />
      {/each}
    </ul>
  {/if}
  {#if tasks.list !== null}
    <footer class="footer">
      <p class="count" aria-live="polite">{countLabel(tasks.list)}</p>
      <button type="button" class="clear" disabled={!tasks.anyDone} onclick={tasks.clearDone}>Clear done</button>
    </footer>
  {/if}
</main>
