// Exercise 2: a tiny store. set() notifies every subscriber, so "render after
// every change" no longer depends on remembering to call render().
// Run: node store.ts
type Listener<T> = (state: T) => void

export function createStore<T>(initial: T) {
  let state = initial
  const listeners = new Set<Listener<T>>()

  return {
    get: () => state,
    set(update: (state: T) => T) {
      const next = update(state)
      if (Object.is(next, state)) return
      state = next
      for (const listener of listeners) listener(state)
    },
    subscribe(listener: Listener<T>) {
      listeners.add(listener)
      listener(state)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

interface Task {
  id: string
  title: string
  done: boolean
}

const tasks = createStore<Task[]>([{ id: '1', title: 'Read the Vue chapter', done: false }])

const stopRender = tasks.subscribe((list) => console.log('render:', list.map((t) => t.title).join(', ')))
tasks.subscribe((list) => console.log('save:', JSON.stringify(list.map((t) => t.id))))

tasks.set((list) => [...list, { id: '2', title: 'Try Svelte runes', done: false }])
tasks.set((list) => list) // same array: nobody is notified
stopRender()
tasks.set((list) => list.filter((t) => t.id !== '1'))
