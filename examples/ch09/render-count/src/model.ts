import { computed, createModel, effect, signal } from '@preact/signals'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

export type Status = 'loading' | 'error' | 'ready'

// All of Tasklet's state and logic, as signals. App creates one with useModel.
export const TaskletModel = createModel(() => {
  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  const tasks = signal<Task[] | null>(loadSavedTasks())
  const failed = signal(false)
  const filter = signal<Filter>('all')

  const status = computed<Status>(() => (failed.value ? 'error' : tasks.value === null ? 'loading' : 'ready'))
  const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
  const left = computed(() => countLabel(tasks.value ?? []))
  const noneDone = computed(() => !tasks.value?.some((task) => task.done))

  // Fetch the seed tasks while loading; Retry clears `failed`, which runs it again.
  // The cleanup ignores a response that arrives after the model was disposed.
  effect(() => {
    if (status.value !== 'loading') return
    let ignore = false
    fetchTasks().then(
      (loaded) => {
        if (!ignore) tasks.value = loaded
      },
      () => {
        if (!ignore) failed.value = true
      },
    )
    return () => {
      ignore = true
    }
  })

  // Save the list to localStorage after every change.
  effect(() => {
    if (tasks.value !== null) saveTasks(tasks.value)
  })

  function update(change: (current: Task[]) => Task[]) {
    if (tasks.value !== null) tasks.value = change(tasks.value)
  }

  return {
    status,
    filter,
    visible,
    left,
    noneDone,
    add(title: string) {
      update((current) => [...current, { id: crypto.randomUUID(), title, done: false }])
    },
    toggle(id: string) {
      update((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
    },
    remove(id: string) {
      update((current) => current.filter((task) => task.id !== id))
    },
    clearDone() {
      update((current) => current.filter((task) => !task.done))
    },
    setFilter(value: Filter) {
      filter.value = value
    },
    retry() {
      failed.value = false
    },
  }
})
