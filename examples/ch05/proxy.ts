// What reactive() returns: a Proxy that records reads (track) and reports writes (trigger).
// Run: node proxy.ts
import { computed, effect, isProxy, reactive, ref, toRaw } from 'vue'

const task = { id: '1', title: 'Read the Vue chapter', done: false }
const state = reactive(task)

console.log('isProxy(state):', isProxy(state), '| toRaw(state) === task:', toRaw(state) === task)

// effect() is the low-level primitive behind computed, watch and component rendering.
effect(() => {
  console.log(`effect ran: ${state.title} is ${state.done ? 'done' : 'not done'}`)
})

state.done = true // tracked property: the effect re-runs
state.id = '42' // not read by the effect: nothing happens
task.done = false // the raw object bypasses the proxy: nothing happens

const tasks = ref([state])
const left = computed(() => tasks.value.filter((t) => !t.done).length)
console.log('left:', left.value)
tasks.value.push(reactive({ id: '2', title: 'Try Svelte runes', done: false }))
console.log('left after push:', left.value)
