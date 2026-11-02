// <toggle-chip>: a pill-shaped toggle button, written with no library.
// Load it with a classic <script>, so index.html also works from file://.

const template = document.createElement('template')
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }
    /* :host beats the browser's [hidden] rule, so restate it. */
    :host([hidden]) {
      display: none;
    }
    button {
      font: inherit;
      padding: 0.25rem 0.75rem;
      border: 1px solid #8a93a3;
      border-radius: 999px;
      background: white;
      color: #1d2330;
      cursor: pointer;
    }
    :host([pressed]) button {
      background: #2f5bd3;
      border-color: #2f5bd3;
      color: white;
    }
    ::slotted([slot="hint"]) {
      font-size: 0.85em;
      opacity: 0.75;
    }
  </style>
  <button type="button" part="button" aria-pressed="false">
    <slot>Toggle</slot> <slot name="hint"></slot>
  </button>
`

class ToggleChip extends HTMLElement {
  // Changes to these attributes call attributeChangedCallback.
  static observedAttributes = ['pressed']

  #button

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.append(template.content.cloneNode(true))
    this.#button = root.querySelector('button')
    this.#button.addEventListener('click', () => {
      this.pressed = !this.pressed
      this.dispatchEvent(
        new CustomEvent('toggle-change', {
          detail: { pressed: this.pressed },
          bubbles: true, // up through the ancestors...
          composed: true, // ...and out of any shadow root the chip sits in
        }),
      )
    })
  }

  // The property reflects the boolean attribute: present means true.
  get pressed() {
    return this.hasAttribute('pressed')
  }

  set pressed(value) {
    this.toggleAttribute('pressed', Boolean(value))
  }

  connectedCallback() {
    // A property set before the element was defined landed on the plain
    // object and hides the setter; take it off and set it again.
    if (Object.hasOwn(this, 'pressed')) {
      const value = this.pressed
      delete this.pressed
      this.pressed = value
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.#button.setAttribute('aria-pressed', String(newValue !== null))
  }
}

customElements.define('toggle-chip', ToggleChip)
