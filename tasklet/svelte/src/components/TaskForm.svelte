<script lang="ts">
  let { onadd }: { onadd: (title: string) => void } = $props()

  let title = $state('')

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    onadd(trimmed)
    title = ''
  }
</script>

<form aria-label="Add task" class="add" onsubmit={submit}>
  <label for="new-task">New task</label>
  <input id="new-task" bind:value={title} name="title" autocomplete="off" />
  <button type="submit">Add</button>
</form>
