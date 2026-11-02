import { $items } from './cart.ts'
import { formatPrice } from './format.ts'

// Loaded with import(), so bundlers put it in its own chunk.
export function renderDetails(target: HTMLElement) {
  const items = $items.get().map((cents, i) => `<li>Item ${i + 1}: ${formatPrice(cents)}</li>`)
  target.innerHTML = `<ol>${items.join('')}</ol>`
}
