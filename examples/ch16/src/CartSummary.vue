<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { $cart, $count, clearCart } from './cart.ts'

const items = useStore($cart)
const count = useStore($count)
</script>

<template>
  <section aria-label="Cart (Vue)">
    <h2>Cart (Vue)</h2>
    <p v-if="count === 0">Your cart is empty.</p>
    <ol v-else>
      <li v-for="(item, index) in items" :key="index">{{ item }}</li>
    </ol>
    <button type="button" :disabled="count === 0" @click="clearCart">Clear cart</button>
  </section>
</template>
