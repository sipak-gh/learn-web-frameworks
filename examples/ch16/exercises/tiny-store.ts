type Listener<T> = (value: T) => void

// The whole idea of a store: a value, a way to change it, and a way to hear about changes.
export function createStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<Listener<T>>()
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return
      value = next
      for (const listener of listeners) listener(value)
    },
    subscribe(listener: Listener<T>) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// One shared empty array, so clearing an empty cart is "no change" for Object.is.
const empty: readonly string[] = []

export const items = createStore(empty)

export const cart = {
  add: (name: string) => items.set([...items.get(), name]),
  clear: () => items.set(empty),
}
