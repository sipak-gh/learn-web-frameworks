<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ add: [title: string] }>()

const title = ref('')

function submit() {
  const trimmed = title.value.trim()
  if (trimmed === '') return
  emit('add', trimmed)
  title.value = ''
}
</script>

<template>
  <form aria-label="Add task" class="add" @submit.prevent="submit">
    <label for="new-task">New task</label>
    <input id="new-task" v-model="title" name="title" autocomplete="off" />
    <button type="submit">Add</button>
  </form>
</template>
