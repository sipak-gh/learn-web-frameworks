import { useStore } from '@nanostores/react'
import { $count, addToCart } from './cart.ts'

const products = ['Apple', 'Pear', 'Plum']

export function Products() {
  const count = useStore($count)
  return (
    <section aria-label="Products (React)">
      <h2>Products (React)</h2>
      <ul>
        {products.map((name) => (
          <li key={name}>
            {name}{' '}
            <button type="button" onClick={() => addToCart(name)}>
              Add {name}
            </button>
          </li>
        ))}
      </ul>
      <p>React sees {count} in the cart.</p>
    </section>
  )
}
