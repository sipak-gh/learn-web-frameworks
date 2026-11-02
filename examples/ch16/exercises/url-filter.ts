type Filter = 'all' | 'active' | 'done'

const filters: readonly Filter[] = ['all', 'active', 'done']
const tasks = [
  { title: 'Read the Vue chapter', done: false },
  { title: 'Try Svelte runes', done: false },
  { title: 'Write a signal from scratch', done: true },
]

const group = document.querySelector<HTMLElement>('[role="group"]')!
const list = document.querySelector<HTMLUListElement>('ul')!

// The URL is the single source of truth: read it, never copy it into a variable.
function currentFilter(): Filter {
  const value = new URLSearchParams(location.search).get('filter')
  return filters.find((filter) => filter === value) ?? 'all'
}

function render() {
  const filter = currentFilter()
  for (const button of group.querySelectorAll<HTMLButtonElement>('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter))
  }
  const shown = tasks.filter((task) => filter === 'all' || task.done === (filter === 'done'))
  list.replaceChildren(
    ...shown.map((task) => {
      const item = document.createElement('li')
      item.textContent = task.title
      return item
    }),
  )
}

group.addEventListener('click', (event) => {
  const button = (event.target as Element).closest('button')
  if (!button) return
  const url = new URL(location.href)
  if (button.dataset.filter === 'all') url.searchParams.delete('filter')
  else url.searchParams.set('filter', button.dataset.filter ?? 'all')
  history.pushState(null, '', url)
  render()
})

// Back and Forward change the URL without a click: render again.
window.addEventListener('popstate', render)
render()
