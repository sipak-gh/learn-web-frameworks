import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const count = useSignal(0);
  const step = 2;

  return (
    <button type="button" onClick$={() => (count.value += step)}>
      Count: {count.value}
    </button>
  );
});
