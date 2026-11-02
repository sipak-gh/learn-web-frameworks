<script setup lang="ts">
import type { Task } from '../tasks.ts'

defineProps<{ task: Task }>()

defineEmits<{ toggle: []; remove: [] }>()
</script>

<template>
  <li :class="['task', { done: task.done }]">
    <label>
      <input type="checkbox" :checked="task.done" @change="$emit('toggle')" /> <span>{{ task.title }}</span>
    </label>
    <button type="button" class="delete" :aria-label="`Delete &quot;${task.title}&quot;`" @click="$emit('remove')">
      ×
    </button>
  </li>
</template>
