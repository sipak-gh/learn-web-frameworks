<script setup lang="ts">
import { computed, ref } from 'vue'
import FilterBar from './components/FilterBar.vue'
import TaskForm from './components/TaskForm.vue'
import TaskItem from './components/TaskItem.vue'
import { countLabel, visibleTasks, type Filter } from './tasks.ts'
import { useTasks } from './useTasks.ts'

const { tasks, failed, anyDone, load, add, toggle, remove, clearDone } = useTasks()
const filter = ref<Filter>('all')
const visible = computed(() => visibleTasks(tasks.value ?? [], filter.value))
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
