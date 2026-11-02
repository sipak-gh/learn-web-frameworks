import { createSignal } from 'solid-js';

interface TaskFormProps {
  onAdd: (title: string) => void;
}

export function TaskForm(props: TaskFormProps) {
  const [title, setTitle] = createSignal('');

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = title().trim();
    if (trimmed === '') return;
    props.onAdd(trimmed);
    setTitle('');
  }

  return (
    <form aria-label="Add task" class="add" onSubmit={handleSubmit}>
      <label for="new-task">New task</label>
      <input
        id="new-task"
        name="title"
        autocomplete="off"
        value={title()}
        onInput={(event) => setTitle(event.currentTarget.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}
