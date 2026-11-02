<script lang="ts">
  let count = 0
  $: double = count * 2
</script>

<button type="button" on:click={() => count++}>
  {count} × 2 = {double}
</button>
