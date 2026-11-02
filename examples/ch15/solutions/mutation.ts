import { signal, effect } from '../signals.ts'

const items = signal(['a'])
effect(() => console.log('items:', items.get().join(', ')))

items.get().push('b') // mutates the array in place: no signal is told
items.set(items.get()) // the same array: Object.is says nothing changed
items.set([...items.get(), 'c']) // a new array: the effect reruns
