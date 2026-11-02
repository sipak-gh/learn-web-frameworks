// Exercise 1: predict the output, then run it.
// Run: node reactivity.ts
import { computed, nextTick, ref, watch, watchEffect } from 'vue'

const tasks = ref([
  { id: '1', title: 'Read the Vue chapter', done: false },
  { id: '2', title: 'Try Svelte runes', done: false },
])

const left = computed(() => {
  console.log('  (computing left)')
  return tasks.value.filter((task) => !task.done).length
})

watchEffect(() => console.log(`watchEffect: ${left.value} left`))
watch(tasks, () => console.log('watch: tasks changed'))
watch(tasks, () => console.log('watch deep: tasks changed'), { deep: true })

console.log('-- A: toggle both tasks')
tasks.value[0]!.done = true
tasks.value[1]!.done = true
await nextTick()

console.log('-- B: add a done task')
tasks.value.push({ id: '3', title: 'Write a signal from scratch', done: true })
await nextTick()

console.log('-- C: replace the array')
tasks.value = []
await nextTick()
