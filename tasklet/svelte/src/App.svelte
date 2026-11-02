<script lang="ts">
  import { onMount } from 'svelte'
  import FilterBar from './components/FilterBar.svelte'
  import TaskForm from './components/TaskForm.svelte'
  import TaskItem from './components/TaskItem.svelte'
  import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
  import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  let tasks = $state<Task[] | null>(loadSavedTasks())
  let failed = $state(false)
  let filter = $state<Filter>('all')

  const visible = $derived(visibleTasks(tasks ?? [], filter))
  const anyDone = $derived(tasks?.some((task) => task.done) ?? false)

  async function load() {
    failed = false
    try {
      tasks = await fetchTasks()
    } catch {
      failed = true
    }
  }

  onMount(() => {
    if (tasks === null) load()
  })

  // Save after every change. saveTasks() stringifies the list, which reads
  // every task, so the effect depends on all of them.
  $effect(() => {
    if (tasks !== null) saveTasks(tasks)
  })

  function add(title: string) {
    tasks?.push({ id: crypto.randomUUID(), title, done: false })
  }

  function remove(id: string) {
    tasks = tasks?.filter((task) => task.id !== id) ?? null
  }

  function clearDone() {
    tasks = tasks?.filter((task) => !task.done) ?? null
  }
</script>

<main class="tasklet">
  <h1>Tasklet</h1>
  <TaskForm onadd={add} />
  <FilterBar bind:filter />
  {#if failed}
    <p role="alert">Couldn't load tasks.</p>
    <button type="button" onclick={load}>Retry</button>
  {:else if tasks === null}
    <p role="status">Loading tasks…</p>
  {:else if visible.length === 0}
    <p class="empty">Nothing to show.</p>
  {:else}
    <ul class="tasks" aria-label="Tasks">
      {#each visible as task (task.id)}
        <TaskItem {task} ontoggle={() => (task.done = !task.done)} onremove={() => remove(task.id)} />
      {/each}
    </ul>
  {/if}
  {#if tasks !== null}
    <footer class="footer">
      <p class="count" aria-live="polite">{countLabel(tasks)}</p>
      <button type="button" class="clear" disabled={!anyDone} onclick={clearDone}>Clear done</button>
    </footer>
  {/if}
</main>
