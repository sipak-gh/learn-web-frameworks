<script lang="ts">
import { defineComponent } from 'vue'

// TaskForm with the Options API: the same behavior as src/components/TaskForm.vue.
export default defineComponent({
  emits: {
    add: (title: string) => title.length > 0,
  },
  data() {
    return { title: '' }
  },
  methods: {
    submit() {
      const trimmed = this.title.trim()
      if (trimmed === '') return
      this.$emit('add', trimmed)
      this.title = ''
    },
  },
})
</script>

<template>
  <form aria-label="Add task" class="add" @submit.prevent="submit">
    <label for="new-task">New task</label>
    <input id="new-task" v-model="title" name="title" autocomplete="off" />
    <button type="submit">Add</button>
  </form>
</template>
