import { atom, computed } from 'nanostores'

// One store, owned by no framework. Any island on the page can import it.
export const $cart = atom<readonly string[]>([])

export const $count = computed($cart, (items) => items.length)

export function addToCart(name: string) {
  $cart.set([...$cart.get(), name])
}

export function clearCart() {
  $cart.set([])
}
