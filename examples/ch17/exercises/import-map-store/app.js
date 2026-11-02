import { atom, computed } from 'nanostores'

const $items = atom([])
const $total = computed($items, (items) => items.reduce((sum, cents) => sum + cents, 0))

const total = document.querySelector('#total')
$total.subscribe((cents) => {
  total.value = `$${(cents / 100).toFixed(2)}`
})

document.querySelector('#add').addEventListener('click', () => {
  $items.set([...$items.get(), 250])
})
