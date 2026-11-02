import { batch, createSignal } from 'solid-js';

const [count, setCount] = createSignal(0);

setCount(1);
console.log('after setCount(1):', count());

batch(() => {
  setCount(2);
  console.log('inside batch:', count());
});
console.log('after batch:', count());
