import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signal, computed, effect, batch } from './signals.ts'

test('computed derives from a signal and stays current', () => {
  const count = signal(1)
  const double = computed(() => count.get() * 2)
  assert.equal(double.get(), 2)
  count.set(5)
  assert.equal(double.get(), 10)
})

test('effect runs once now, then after every real change', () => {
  const count = signal(0)
  const seen: number[] = []
  effect(() => { seen.push(count.get()) })
  count.set(1)
  count.set(1) // same value: no notification
  count.set(2)
  assert.deepEqual(seen, [0, 1, 2])
})

test('diamond: no glitch, each node recomputes once', () => {
  //      a
  //     / \
  //    b   c
  //     \ /
  //      d
  const a = signal(1)
  let runs = 0
  const b = computed(() => a.get() * 2)
  const c = computed(() => a.get() + 10)
  const d = computed(() => { runs++; return `${b.get()}+${c.get()}` })
  const seen: string[] = []
  effect(() => { seen.push(d.get()) })
  a.set(2)
  assert.deepEqual(seen, ['2+11', '4+12']) // never "4+11" (half-updated)
  assert.equal(runs, 2)
})

test('an unchanged computed value stops propagation', () => {
  const n = signal(2)
  const isEven = computed(() => n.get() % 2 === 0)
  let runs = 0
  effect(() => { isEven.get(); runs++ })
  n.set(4) // isEven is still true
  assert.equal(runs, 1)
  n.set(5)
  assert.equal(runs, 2)
})

test('batch: many writes, one effect run', () => {
  const first = signal('Ada')
  const last = signal('Lovelace')
  const seen: string[] = []
  effect(() => { seen.push(`${first.get()} ${last.get()}`) })
  batch(() => {
    first.set('Grace')
    last.set('Hopper')
  })
  assert.deepEqual(seen, ['Ada Lovelace', 'Grace Hopper'])
})

test('dependencies are dynamic: only what was read last time counts', () => {
  const showDetails = signal(false)
  const details = signal('x')
  let runs = 0
  effect(() => { runs++; if (showDetails.get()) details.get() })
  details.set('y') // not read in the last run
  assert.equal(runs, 1)
  showDetails.set(true)
  details.set('z')
  assert.equal(runs, 3)
})

test('cleanup runs before a rerun and on dispose', () => {
  const id = signal(1)
  const log: string[] = []
  const dispose = effect(() => {
    const current = id.get()
    log.push(`start ${current}`)
    return () => log.push(`stop ${current}`)
  })
  id.set(2)
  dispose()
  id.set(3) // disposed: nothing happens
  assert.deepEqual(log, ['start 1', 'stop 1', 'start 2', 'stop 2'])
})

test('ownership: a rerun disposes the effects created inside it', () => {
  const outer = signal(0)
  const inner = signal(0)
  let innerRuns = 0
  effect(() => {
    outer.get()
    effect(() => { inner.get(); innerRuns++ })
  })
  outer.set(1) // the first inner effect is disposed, a new one created
  inner.set(1) // only the live inner effect reruns
  assert.equal(innerRuns, 3)
})
