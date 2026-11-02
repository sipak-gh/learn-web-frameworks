<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import FilterBar from './components/FilterBar.vue'
import TaskForm from './components/TaskForm.vue'
import TaskItem from './components/TaskItem.vue'
import { useTasksStore } from './stores/tasks.ts'
import { countLabel, visibleTasks, type Filter } from './tasks.ts'

const store = useTasksStore()
// The filter is view state, not shared, so it stays in the component.
const filter = ref<Filter>('all')

const visible = computed(() => visibleTasks(store.tasks ?? [], filter.value))

onMounted(() => {
  if (store.tasks === null) store.load()
})
</script>

<template>
  <main class="tasklet">
    <h1>Tasklet</h1>
    <TaskForm @add="store.add" />
    <FilterBar v-model="filter" />
    <template v-if="store.failed">
      <p role="alert">Couldn't load tasks.</p>
      <button type="button" @click="store.load">Retry</button>
    </template>
    <p v-else-if="store.tasks === null" role="status">Loading tasks…</p>
    <p v-else-if="visible.length === 0" class="empty">Nothing to show.</p>
    <ul v-else class="tasks" aria-label="Tasks">
      <TaskItem
        v-for="task in visible"
        :key="task.id"
        :task="task"
        @toggle="store.toggle(task)"
        @remove="store.remove(task.id)"
      />
    </ul>
    <footer v-if="store.tasks !== null" class="footer">
      <p class="count" aria-live="polite">{{ countLabel(store.tasks) }}</p>
      <button type="button" class="clear" :disabled="!store.anyDone" @click="store.clearDone">Clear done</button>
    </footer>
  </main>
</template>
