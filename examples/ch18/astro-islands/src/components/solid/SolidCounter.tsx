/** @jsxImportSource solid-js */
import { createSignal } from 'solid-js';

export default function SolidCounter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);
  return (
    <>
      <p>
        Count: <output>{count()}</output>
      </p>
      <button type="button" onClick={() => setCount(count() + 1)}>
        Add one
      </button>
    </>
  );
}
