<script lang="ts">
  import TaskList from './TaskList.svelte'
  import type { Task } from '../tasks.ts'

  let tasks = $state<Task[]>([{ id: '1', title: 'Try snippets', done: false }])
</script>

<TaskList {tasks}>
  {#snippet item(task: Task)}
    <li class={['task', task.done && 'done']}>
      <label><input type="checkbox" bind:checked={task.done} /> <span>{task.title}</span></label>
    </li>
  {/snippet}
  {#snippet empty()}
    <p class="empty">All clear.</p>
  {/snippet}
</TaskList>
