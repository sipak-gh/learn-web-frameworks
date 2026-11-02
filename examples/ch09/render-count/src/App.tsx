import { useModel } from '@preact/signals'
import { For, Show } from '@preact/signals/utils'
import { FilterBar } from './components/FilterBar.tsx'
import { TaskForm } from './components/TaskForm.tsx'
import { TaskItem } from './components/TaskItem.tsx'
import { TaskletModel } from './model.ts'

export function App() {
  const model = useModel(TaskletModel)
  // The only .value read here: App re-renders when the status changes, not when a task does.
  const status = model.status.value

  return (
    <main class="tasklet">
      <h1>Tasklet</h1>
      <TaskForm onAdd={model.add} />
      <FilterBar filter={model.filter} onChange={model.setFilter} />
      {status === 'loading' && <p role="status">Loading tasks…</p>}
      {status === 'error' && (
        <>
          <p role="alert">Couldn't load tasks.</p>
          <button type="button" onClick={model.retry}>
            Retry
          </button>
        </>
      )}
      {status === 'ready' && (
        <>
          <Show when={() => model.visible.value.length > 0} fallback={<p class="empty">Nothing to show.</p>}>
            <ul class="tasks" aria-label="Tasks">
              <For each={model.visible} getKey={(task) => task.id}>
                {(task) => (
                  <TaskItem task={task} onToggle={() => model.toggle(task.id)} onRemove={() => model.remove(task.id)} />
                )}
              </For>
            </ul>
          </Show>
          <footer class="footer">
            <p class="count" aria-live="polite">
              {model.left}
            </p>
            <button type="button" class="clear" disabled={model.noneDone} onClick={model.clearDone}>
              Clear done
            </button>
          </footer>
        </>
      )}
    </main>
  )
}
