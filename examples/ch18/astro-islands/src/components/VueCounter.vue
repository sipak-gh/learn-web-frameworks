<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{ start?: number }>(), { start: 0 });
const count = ref(props.start);
</script>

<template>
  <p>Count: <output>{{ count }}</output></p>
  <button type="button" @click="count++">Add one</button>
</template>
