import { signal, computed, effect } from './signals.ts'

const a = signal(1)
const b = computed(() => a.get() * 2)
const c = computed(() => a.get() + 10)
const d = computed(() => `${b.get()}+${c.get()}`)
effect(() => console.log('d =', d.get()))

a.set(2)
