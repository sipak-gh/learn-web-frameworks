import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Filter } from '../tasks.ts'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

// The All / Active / Done buttons. Fires filter-change with the chosen filter.
@customElement('filter-bar')
export class FilterBar extends LitElement {
  // A public reactive property, also settable as an attribute: filter="done".
  @property() filter: Filter = 'all'

  protected createRenderRoot() {
    return this
  }

  render() {
    return html`
      <div class="filters" role="group" aria-label="Filter">
        ${FILTERS.map(
          ({ value, label }) => html`
            <button
              type="button"
              aria-pressed=${String(value === this.filter)}
              @click=${() => this.dispatchEvent(new CustomEvent('filter-change', { detail: value }))}
            >
              ${label}
            </button>
          `,
        )}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'filter-bar': FilterBar
  }
}
