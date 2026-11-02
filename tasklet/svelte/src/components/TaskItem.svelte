<script lang="ts">
  import type { Task } from '../tasks.ts'

  interface Props {
    task: Task
    ontoggle: () => void
    onremove: () => void
  }

  let { task, ontoggle, onremove }: Props = $props()
</script>

<li class={['task', task.done && 'done']}>
  <label>
    <input type="checkbox" checked={task.done} onchange={ontoggle} /> <span>{task.title}</span>
  </label>
  <button type="button" class="delete" aria-label={`Delete "${task.title}"`} onclick={onremove}>×</button>
</li>
