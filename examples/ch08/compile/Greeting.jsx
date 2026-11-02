export function Greeting(props) {
  return <p class="greeting">Hello, {props.name}!</p>;
}

export function DestructuredGreeting({ name }) {
  return <p class="greeting">Hello, {name}!</p>;
}
