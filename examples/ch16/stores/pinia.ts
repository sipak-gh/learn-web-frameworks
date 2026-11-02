import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// A "setup store": the same ref/computed you write in a component.
export const useCartStore = defineStore('cart', () => {
  const items = ref<string[]>([])
  const count = computed(() => items.value.length)
  function add(name: string) {
    items.value.push(name)
  }
  function clear() {
    items.value = []
  }
  return { items, count, add, clear }
})
