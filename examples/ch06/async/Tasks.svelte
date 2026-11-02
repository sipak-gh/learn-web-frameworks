<script lang="ts">
  const response = await fetch('./tasks.json')
  const tasks: { id: string; title: string }[] = await response.json()
</script>

<ul>
  {#each tasks as task (task.id)}
    <li>{task.title}</li>
  {/each}
</ul>
