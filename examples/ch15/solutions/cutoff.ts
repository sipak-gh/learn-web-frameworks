import { signal, computed, effect } from '../signals.ts'

const runs: string[] = []
const a = signal(1)
const b = computed(() => { runs.push('b'); return a.get() > 0 })
const c = computed(() => { runs.push('c'); return a.get() % 2 === 0 ? 'even' : 'odd' })
const d = computed(() => { runs.push('d'); return `${b.get()} ${c.get()}` })
effect(() => { runs.push('effect'); console.log('d =', d.get()) })

runs.length = 0
a.set(3) // b stays true and c stays "odd"
console.log('after a.set(3), reran:', runs.join(', '))

runs.length = 0
a.set(4) // b stays true, c becomes "even"
console.log('after a.set(4), reran:', runs.join(', '))
