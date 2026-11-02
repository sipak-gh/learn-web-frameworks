<script lang="ts">
  let { start = 0 }: { start?: number } = $props();
  let count = $state(start);
</script>

<p>Count: <output>{count}</output></p>
<button type="button" onclick={() => (count += 1)}>Add one</button>
