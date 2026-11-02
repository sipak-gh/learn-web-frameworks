import { createSignal } from 'solid-js';
import { Greeting } from './Greeting.jsx';

export function Parent() {
  const [user, setUser] = createSignal('Ada');
  return <Greeting name={user()} />;
}
