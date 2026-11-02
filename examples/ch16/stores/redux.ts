import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as string[] },
  reducers: {
    // Immer turns these "mutations" into new immutable state.
    added(state, action: PayloadAction<string>) {
      state.items.push(action.payload)
    },
    cleared(state) {
      state.items = []
    },
  },
  selectors: {
    selectCount: (cart) => cart.items.length,
  },
})

export const { added, cleared } = cartSlice.actions
export const { selectCount } = cartSlice.selectors

export const store = configureStore({ reducer: { cart: cartSlice.reducer } })
