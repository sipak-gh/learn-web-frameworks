import { countRender } from '../render-count.ts'
import { useState, type SubmitEvent } from 'react'

interface TaskFormProps {
  onAdd: (title: string) => void
}

export function TaskForm({ onAdd }: TaskFormProps) {
  countRender('TaskForm')
  const [title, setTitle] = useState('')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return
    onAdd(trimmed)
    setTitle('')
  }

  return (
    <form aria-label="Add task" className="add" onSubmit={handleSubmit}>
      <label htmlFor="new-task">New task</label>
      <input
        id="new-task"
        name="title"
        autoComplete="off"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  )
}
