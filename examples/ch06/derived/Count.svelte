<script lang="ts">
  let tasks = $state([
    { title: 'Read the Vue chapter', done: false },
    { title: 'Try Svelte runes', done: false },
  ])
  const left = tasks.filter((task) => !task.done).length
</script>

<ul>
  {#each tasks as task (task.title)}
    <li><label><input type="checkbox" bind:checked={task.done} /> {task.title}</label></li>
  {/each}
</ul>
<p>{left} left</p>
