import { createStore } from 'zustand/vanilla'

interface CartState {
  items: string[]
  add: (name: string) => void
  clear: () => void
}

// zustand's `create` makes a React hook; `createStore` makes a plain store.
export const cartStore = createStore<CartState>()((set) => ({
  items: [],
  add: (name) => set((state) => ({ items: [...state.items, name] })),
  clear: () => set({ items: [] }),
}))
