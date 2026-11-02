import { signal, computed, effect } from './signals.ts'

const count = signal(0)
const double = computed(() => count.get() * 2)

const button = document.querySelector<HTMLButtonElement>('#increment')!
const output = document.querySelector<HTMLParagraphElement>('#double')!

// Each effect is a precise DOM update: it reruns only when what it read changes.
effect(() => { button.textContent = `Count: ${count.get()}` })
effect(() => { output.textContent = `Double: ${double.get()}` })
effect(() => { console.log('count is', count.get()) })

button.addEventListener('click', () => count.set(count.get() + 1))
