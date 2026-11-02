import { cart } from './cart.svelte.ts'

// $effect only exists in .svelte and .svelte.ts files.
export function watchCount(seen: number[]) {
  return $effect.root(() => {
    $effect(() => {
      seen.push(cart.count)
    })
  })
}
