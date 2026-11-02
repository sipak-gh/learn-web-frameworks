// A tiny store. Every island that imports this module shares the same instance,
// because the bundler puts it in one chunk and the browser evaluates it once.
type Listener = (value: number) => void;

let value = 0;
const listeners = new Set<Listener>();

export const count = {
  get: () => value,
  set(next: number) {
    value = next;
    listeners.forEach((listener) => listener(value));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
