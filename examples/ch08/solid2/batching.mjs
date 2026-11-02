import { createEffect, createMemo, createRoot, createSignal, flush } from 'solid-js';

const [count, setCount] = createSignal(0);

setCount(1);
console.log('after setCount(1):', count());
flush();
console.log('after flush():', count());

createRoot(() => {
  const double = createMemo(() => count() * 2);
  // Split effect: the first function tracks, the second does the side effect.
  createEffect(
    () => double(),
    (value) => {
      console.log('effect applies double =', value);
      return () => console.log('  cleanup for', value);
    },
  );
});
flush();

setCount(5);
setCount(6);
await Promise.resolve();
console.log('after a microtask:', count());
