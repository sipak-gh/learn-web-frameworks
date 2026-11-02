<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  let title = $state('')

  // Runs when the element is mounted; the returned function runs when it is removed.
  const autofocus: Attachment<HTMLInputElement> = (input) => {
    input.focus()
    return () => console.log('input removed')
  }
</script>

<input {@attach autofocus} bind:value={title} aria-label="New task" />
