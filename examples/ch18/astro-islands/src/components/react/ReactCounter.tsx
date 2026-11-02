import { useState } from 'react';

export default function ReactCounter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return (
    <>
      <p>
        Count: <output>{count}</output>
      </p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Add one
      </button>
    </>
  );
}
