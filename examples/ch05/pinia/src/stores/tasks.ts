import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { fetchTasks, loadSavedTasks, saveTasks } from '../storage.ts'
import type { Task } from '../tasks.ts'

// Exercise 4: Tasklet's task list as a Pinia setup store.
export const useTasksStore = defineStore('tasks', () => {
  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
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

  watch(
    tasks,
    (current) => {
      if (current !== null) saveTasks(current)
    },
    { deep: true },
  )

  function add(title: string) {
    tasks.value?.push({ id: crypto.randomUUID(), title, done: false })
  }

  function toggle(task: Task) {
    task.done = !task.done
  }

  function remove(id: string) {
    tasks.value = tasks.value?.filter((task) => task.id !== id) ?? null
  }

  function clearDone() {
    tasks.value = tasks.value?.filter((task) => !task.done) ?? null
  }

  return { tasks, failed, anyDone, load, add, toggle, remove, clearDone }
})
