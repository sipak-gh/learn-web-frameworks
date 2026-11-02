import { countRender } from './render-count.ts'
import { useEffect, useState } from 'react'
import { FilterBar } from './components/FilterBar.tsx'
import { TaskForm } from './components/TaskForm.tsx'
import { TaskItem } from './components/TaskItem.tsx'
import { fetchTasks, loadSavedTasks, saveTasks } from './storage.ts'
import { countLabel, visibleTasks, type Filter, type Task } from './tasks.ts'

export default function App() {
  countRender('App')
  // null until the tasks are loaded, from localStorage (right away) or tasks.json.
  const [tasks, setTasks] = useState<Task[] | null>(loadSavedTasks)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const loading = tasks === null && !failed

  // Fetch the seed tasks while loading. The ignore flag drops a response that
  // arrives after the Effect was cleaned up (Strict Mode runs it twice in dev).
  useEffect(() => {
    if (!loading) return
    let ignore = false
    fetchTasks().then(
      (loaded) => {
        if (!ignore) setTasks(loaded)
      },
      () => {
        if (!ignore) setFailed(true)
      },
    )
    return () => {
      ignore = true
    }
  }, [loading])

  // Sync the list to localStorage after every change.
  useEffect(() => {
    if (tasks !== null) saveTasks(tasks)
  }, [tasks])

  function handleAdd(title: string) {
    setTasks((current) => [...(current ?? []), { id: crypto.randomUUID(), title, done: false }])
  }

  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }

  function handleRemove(id: string) {
    setTasks((current) => current && current.filter((task) => task.id !== id))
  }

  function handleClearDone() {
    setTasks((current) => current && current.filter((task) => !task.done))
  }

  let content
  if (failed) {
    content = (
      <>
        <p role="alert">Couldn't load tasks.</p>
        <button type="button" onClick={() => setFailed(false)}>
          Retry
        </button>
      </>
    )
  } else if (tasks === null) {
    content = <p role="status">Loading tasks…</p>
  } else {
    const visible = visibleTasks(tasks, filter)
    content =
      visible.length === 0 ? (
        <p className="empty">Nothing to show.</p>
      ) : (
        <ul className="tasks" aria-label="Tasks">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task.id)}
              onRemove={() => handleRemove(task.id)}
            />
          ))}
        </ul>
      )
  }

  return (
    <main className="tasklet">
      <h1>Tasklet</h1>
      <TaskForm onAdd={handleAdd} />
      <FilterBar filter={filter} onChange={setFilter} />
      {content}
      {tasks !== null && (
        <footer className="footer">
          <p className="count" aria-live="polite">
            {countLabel(tasks)}
          </p>
          <button
            type="button"
            className="clear"
            disabled={!tasks.some((task) => task.done)}
            onClick={handleClearDone}
          >
            Clear done
          </button>
        </footer>
      )}
    </main>
  )
}
