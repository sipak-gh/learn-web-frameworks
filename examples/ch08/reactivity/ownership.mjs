import { createEffect, createMemo, createRoot, createSignal, onCleanup } from 'solid-js';

const [count, setCount] = createSignal(0);

// createRoot creates an owner. Everything created inside belongs to it.
const dispose = createRoot((dispose) => {
  const double = createMemo(() => count() * 2);
  createEffect(() => {
    console.log(`effect: count=${count()} double=${double()}`);
    onCleanup(() => console.log('  cleanup'));
  });
  return dispose;
});

console.log('setCount(1)');
setCount(1);
console.log('dispose()');
dispose();
console.log('setCount(2)');
setCount(2);
console.log('done');
