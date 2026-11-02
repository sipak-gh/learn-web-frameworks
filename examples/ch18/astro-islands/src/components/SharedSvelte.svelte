<script lang="ts">
  import { count } from '../lib/count';

  let value = $state(count.get());
  $effect(() => count.subscribe((next) => (value = next)));
</script>

<button type="button" onclick={() => count.set(value + 1)}>Svelte: {value}</button>
