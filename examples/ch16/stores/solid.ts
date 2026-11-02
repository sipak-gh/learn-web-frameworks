import { createStore } from 'solid-js/store'

const [cart, setCart] = createStore({ items: [] as string[] })

export { cart }

export const count = () => cart.items.length

export function add(name: string) {
  // Path syntax: set index `length` of `items`, i.e. append.
  setCart('items', cart.items.length, name)
}

export function clear() {
  setCart('items', [])
}
