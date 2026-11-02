import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signal, effect, untrack } from './signals.ts'

test('untrack reads the current value without subscribing', () => {
  const count = signal(0)
  const label = signal('clicks')
  const seen: string[] = []
  effect(() => { seen.push(`${count.get()} ${untrack(() => label.get())}`) })
  label.set('taps') // not a dependency: no rerun
  count.set(1) // a dependency: rerun, and it sees the new label
  assert.deepEqual(seen, ['0 clicks', '1 taps'])
})

test('tracking resumes after untrack returns', () => {
  const a = signal(1)
  const b = signal(1)
  let runs = 0
  effect(() => { untrack(() => a.get()); b.get(); runs++ })
  b.set(2)
  assert.equal(runs, 2)
})
