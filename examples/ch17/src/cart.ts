import { atom, computed } from 'nanostores'

export const $items = atom<readonly number[]>([])

export const $total = computed($items, (items) => items.reduce((sum, cents) => sum + cents, 0))

export function addItem(cents: number) {
  $items.set([...$items.get(), cents])
}
