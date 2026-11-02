import { $total, addItem } from './cart.ts'
import { formatPrice } from './format.ts'

const total = document.querySelector<HTMLOutputElement>('#total')!
const details = document.querySelector<HTMLDivElement>('#details')!

$total.subscribe((cents) => {
  total.value = formatPrice(cents)
})

document.querySelector('#add')!.addEventListener('click', () => addItem(250))

document.querySelector('#show')!.addEventListener('click', async () => {
  const { renderDetails } = await import('./details.ts')
  renderDetails(details)
})
