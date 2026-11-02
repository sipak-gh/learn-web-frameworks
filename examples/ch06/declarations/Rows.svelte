<script lang="ts">
  let tasks = $state([
    { id: '1', title: 'Read the Vue chapter', done: true },
    { id: '2', title: 'Try Svelte runes', done: false },
  ])
</script>

<ul>
  {#each tasks as task (task.id)}
    <li>
      {let open = $state(false)}
      <button type="button" onclick={() => (open = !open)}>{task.title}</button>
      {#if open}<span>{task.done ? 'done' : 'to do'}</span>{/if}
    </li>
  {/each}
</ul>
