import { component$, useSignal, type QRL } from "@builder.io/qwik";

interface TaskFormProps {
  onAdd$: QRL<(title: string) => void>;
}

// The "Add task" form. Calls onAdd$ with the trimmed title; ignores blanks.
export const TaskForm = component$<TaskFormProps>(({ onAdd$ }) => {
  const title = useSignal("");

  return (
    <form
      class="add"
      aria-label="Add task"
      // Handlers load lazily, so they can't call event.preventDefault() in
      // time; this attribute tells Qwik's global listener to do it.
      preventdefault:submit
      onSubmit$={async () => {
        const trimmed = title.value.trim();
        if (trimmed === "") return;
        await onAdd$(trimmed);
        title.value = "";
      }}
    >
      <label for="new-task">New task</label>
      <input id="new-task" name="title" autoComplete="off" bind:value={title} />
      <button type="submit">Add</button>
    </form>
  );
});
