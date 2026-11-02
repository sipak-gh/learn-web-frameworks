// Exercise 3: Tasklet's state and persistence as a composable.
// Copy to tasklet/vue/src/useTasks.ts (and App.vue next to it).
import { computed, onMounted, ref, watch } from 'vue'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import type { Task } from './tasks.ts'

export function useTasks() {
  const tasks = ref<Task[] | null>(loadSavedTasks())
  const failed = ref(false)
  const anyDone = computed(() => tasks.value?.some((task) => task.done) ?? false)

  async function load() {
    failed.value = false
    try {
      tasks.value = await fetchTasks()
    } catch {
      failed.value = true
    }
  }

  onMounted(() => {
    if (tasks.value === null) load()
  })

  watch(
    tasks,
    (current) => {
      if (current !== null) saveTasks(current)
    },
    { deep: true },
  )

  return {
    tasks,
    failed,
    anyDone,
    load,
    add(title: string) {
      tasks.value?.push({ id: crypto.randomUUID(), title, done: false })
    },
    toggle(task: Task) {
      task.done = !task.done
    },
    remove(id: string) {
      tasks.value = tasks.value?.filter((task) => task.id !== id) ?? null
    },
    clearDone() {
      tasks.value = tasks.value?.filter((task) => !task.done) ?? null
    },
  }
}
