import { createComponent as _$createComponent } from "solid-js/web";
import { createSignal } from 'solid-js';
import { Greeting } from './Greeting.jsx';
export function Parent() {
  const [user, setUser] = createSignal('Ada');
  return _$createComponent(Greeting, {
    get name() {
      return user();
    }
  });
}
