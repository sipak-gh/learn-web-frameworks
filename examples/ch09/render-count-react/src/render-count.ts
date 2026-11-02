// Counts how often each component function runs. Each component calls
// countRender('Name') as its first line (added only in this copy).
const counts = new Map<string, number>()

export function countRender(name: string) {
  counts.set(name, (counts.get(name) ?? 0) + 1)
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
