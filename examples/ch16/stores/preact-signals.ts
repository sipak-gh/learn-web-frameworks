import { computed, signal } from '@preact/signals-core'

export const items = signal<string[]>([])

export const count = computed(() => items.value.length)

export function add(name: string) {
  items.value = [...items.value, name]
}

export function clear() {
  items.value = []
}
