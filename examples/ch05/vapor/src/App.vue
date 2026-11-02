<script setup vapor lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FilterBar from './components/FilterBar.vue'
import TaskForm from './components/TaskForm.vue'
import TaskItem from './components/TaskItem.vue'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

// null until the tasks are loaded, from localStorage (right away) or tasks.json.
const tasks = ref<Task[] | null>(loadSavedTasks())
const failed = ref(false)
const filter = ref<Filter>('all')

const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
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

// Save after every change: a new array, or a change inside it (deep).
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
</script>

<template>
  <main class="tasklet">
    <h1>Tasklet</h1>
    <TaskForm @add="add" />
    <FilterBar v-model="filter" />
    <template v-if="failed">
      <p role="alert">Couldn't load tasks.</p>
      <button type="button" @click="load">Retry</button>
    </template>
    <p v-else-if="tasks === null" role="status">Loading tasks…</p>
    <p v-else-if="visible.length === 0" class="empty">Nothing to show.</p>
    <ul v-else class="tasks" aria-label="Tasks">
      <TaskItem
        v-for="task in visible"
        :key="task.id"
        :task="task"
        @toggle="toggle(task)"
        @remove="remove(task.id)"
      />
    </ul>
    <footer v-if="tasks !== null" class="footer">
      <p class="count" aria-live="polite">{{ countLabel(tasks) }}</p>
      <button type="button" class="clear" :disabled="!anyDone" @click="clearDone">Clear done</button>
    </footer>
  </main>
</template>
