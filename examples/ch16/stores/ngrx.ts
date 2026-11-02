import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals'

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState({ items: [] as string[] }),
  withComputed(({ items }) => ({
    count: () => items().length,
  })),
  withMethods((store) => ({
    add(name: string) {
      patchState(store, (state) => ({ items: [...state.items, name] }))
    },
    clear() {
      patchState(store, { items: [] })
    },
  })),
)
