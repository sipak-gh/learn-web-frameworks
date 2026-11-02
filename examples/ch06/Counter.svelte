<script lang="ts">
  let count = $state(0)
  const double = $derived(count * 2)
</script>

<button type="button" onclick={() => count++}>
  {count} × 2 = {double}
</button>
