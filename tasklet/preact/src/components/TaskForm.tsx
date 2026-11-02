import { useSignal } from '@preact/signals'
import type { TargetedSubmitEvent } from 'preact'

interface TaskFormProps {
  onAdd: (title: string) => void
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const title = useSignal('')

  function handleSubmit(event: TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.value.trim()
    if (trimmed === '') return
    onAdd(trimmed)
    title.value = ''
  }

  // value={title} passes the signal itself: typing updates the input without re-rendering TaskForm.
  return (
    <form aria-label="Add task" class="add" onSubmit={handleSubmit}>
      <label for="new-task">New task</label>
      <input
        id="new-task"
        name="title"
        autocomplete="off"
        value={title}
        onInput={(event) => (title.value = event.currentTarget.value)}
      />
      <button type="submit">Add</button>
    </form>
  )
}
