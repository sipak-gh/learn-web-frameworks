import { createRoot } from 'react-dom/client'
import { createApp } from 'vue'
import { $count } from './cart.ts'
import CartSummary from './CartSummary.vue'
import { Products } from './Products.tsx'

createRoot(document.getElementById('react-root')!).render(<Products />)
createApp(CartSummary).mount('#vue-root')

// A third subscriber with no framework at all.
const badge = document.getElementById('badge')!
$count.subscribe((count) => {
  badge.textContent = count === 1 ? '1 item' : `${count} items`
})
