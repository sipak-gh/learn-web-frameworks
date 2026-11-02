import { options, type VNode } from 'preact'

// Counts how often each component renders, using Preact's documented
// options.diffed hook (called after a vnode has been diffed).
const counts = new Map<string, number>()
const previous = options.diffed

options.diffed = (vnode: VNode) => {
  if (typeof vnode.type === 'function') {
    const name = vnode.type.displayName ?? vnode.type.name
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  previous?.(vnode)
}

declare global {
  interface Window {
    takeRenderCounts: () => Record<string, number>
  }
}

// Returns the counts since the last call and starts again from zero.
window.takeRenderCounts = () => {
  const result = Object.fromEntries(counts)
  counts.clear()
  return result
}
