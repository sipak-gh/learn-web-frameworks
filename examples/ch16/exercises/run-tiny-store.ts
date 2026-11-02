import { cart, items } from './tiny-store.ts'

const seen: number[] = []
const unsubscribe = items.subscribe((list) => seen.push(list.length))
cart.add('Apple')
cart.add('Pear')
cart.clear()
cart.clear()
unsubscribe()
cart.add('Plum')
console.log(`tiny store      ${seen.join(' → ')}`)
console.log(`after unsubscribe the store still works: ${items.get().join(', ')}`)
