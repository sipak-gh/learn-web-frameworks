type Tag = keyof HTMLElementTagNameMap

// Creates an element, sets its properties and appends its children:
// el('button', { type: 'button' }, 'Add').
export function el<K extends Tag>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = Object.assign(document.createElement(tag), props)
  element.append(...children)
  return element
}
