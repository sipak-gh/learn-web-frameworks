import { render } from 'preact'
import { useState } from 'preact/hooks'
import { html } from 'htm/preact'
import { plural } from './plural.js'

function Counter() {
  const [count, setCount] = useState(0)
  // htm turns this tagged template into preact.h() calls at run time: no JSX compiler needed.
  return html`
    <p>Clicked ${count} ${plural(count, 'time')}</p>
    <button type="button" onClick=${() => setCount(count + 1)}>Click me</button>
  `
}

render(html`<${Counter} />`, document.getElementById('app'))
