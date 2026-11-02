// Runes work in .svelte.ts modules too, so shared state is just a class.
class Cart {
  items = $state<string[]>([])
  count = $derived(this.items.length)

  add(name: string) {
    this.items.push(name)
  }

  clear() {
    this.items = []
  }
}

export const cart = new Cart()
