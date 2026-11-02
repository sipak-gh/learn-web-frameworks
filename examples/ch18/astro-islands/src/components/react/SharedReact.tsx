import { useSyncExternalStore } from 'react';
import { count } from '../../lib/count';

export default function SharedReact() {
  const value = useSyncExternalStore(count.subscribe, count.get, count.get);
  return (
    <button type="button" onClick={() => count.set(value + 1)}>
      React: {value}
    </button>
  );
}
