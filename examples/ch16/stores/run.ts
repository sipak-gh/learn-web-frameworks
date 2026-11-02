// Runs the same script against every store and prints what each
// subscriber saw: add Apple, add Pear, clear, clear again.
// Outside the Angular CLI, NgRx's partially compiled store needs the JIT compiler.
import '@angular/compiler'
import { watchState } from '@ngrx/signals'
import { Injector } from '@angular/core'
import { effect } from '@preact/signals-core'
import { createPinia, setActivePinia } from 'pinia'
import { createEffect, createRoot } from 'solid-js'
import { flushSync } from 'svelte'
import { watch } from 'vue'
import { createStore as createJotaiStore } from 'jotai/vanilla'
import * as jotai from './jotai.ts'
import { CartStore } from './ngrx.ts'
import { useCartStore } from './pinia.ts'
import * as preact from './preact-signals.ts'
import { added, cleared, selectCount, store as reduxStore } from './redux.ts'
import * as solid from './solid.ts'
import { cart as svelteCart } from './cart.svelte.ts'
import { watchCount } from './watch.svelte.ts'
import { cartStore as zustandStore } from './zustand.ts'
import { $count, addToCart, clearCart } from '../src/cart.ts'

interface Cart {
  add: (name: string) => void
  clear: () => void
}

function run(library: string, cart: Cart, seen: number[], after = () => {}) {
  const steps = [() => cart.add('Apple'), () => cart.add('Pear'), () => cart.clear(), () => cart.clear()]
  for (const step of steps) {
    step()
    after()
  }
  console.log(`${library.padEnd(15)} ${seen.join(' → ')}`)
}

{
  const seen: number[] = []
  reduxStore.subscribe(() => seen.push(selectCount(reduxStore.getState())))
  run('Redux Toolkit', {
    add: (name) => reduxStore.dispatch(added(name)),
    clear: () => reduxStore.dispatch(cleared()),
  }, seen)
}
{
  const seen: number[] = []
  zustandStore.subscribe((state) => seen.push(state.items.length))
  run('Zustand', zustandStore.getState(), seen)
}
{
  const seen: number[] = []
  const store = createJotaiStore()
  store.sub(jotai.countAtom, () => seen.push(store.get(jotai.countAtom)))
  run('Jotai', {
    add: (name) => store.set(jotai.addAtom, name),
    clear: () => store.set(jotai.clearAtom),
  }, seen)
}
{
  const seen: number[] = []
  setActivePinia(createPinia())
  const cart = useCartStore()
  watch(() => cart.count, (count) => seen.push(count), { flush: 'sync' })
  run('Pinia', cart, seen)
}
{
  const seen: number[] = []
  const injector = Injector.create({ providers: [CartStore] })
  const cart = injector.get(CartStore)
  watchState(cart, () => seen.push(cart.count()), { injector })
  run('NgRx Signals', cart, seen)
}
{
  const seen: number[] = []
  $count.subscribe((count) => seen.push(count))
  run('nanostores', { add: addToCart, clear: clearCart }, seen)
}
{
  const seen: number[] = []
  effect(() => {
    seen.push(preact.count.value)
  })
  run('Preact Signals', preact, seen)
}
{
  const seen: number[] = []
  createRoot(() => createEffect(() => seen.push(solid.count())))
  run('Solid store', solid, seen)
}
{
  const seen: number[] = []
  watchCount(seen)
  flushSync()
  run('Svelte runes', svelteCart, seen, flushSync)
}
