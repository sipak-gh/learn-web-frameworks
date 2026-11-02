# Chapter 12 examples

Web Components without a library, for [Chapter 12](../../12-lit-and-web-components.md).

`toggle-chip.js` defines `<toggle-chip>` with `customElements.define`, an open shadow root, a default and a
named slot, a `part`, a reflected `pressed` attribute/property and a `toggle-change` event. Open
`index.html` directly in a browser (it uses a classic script, so `file://` works), or check it headlessly:

```sh
npm ci
npx playwright install chromium   # once, if Chromium isn't installed yet
npm run verify                    # what the chip does: slots, styles, attributes, events, upgrade
npm run verify:solutions          # the exercise solutions
```

| File | Exercise |
| --- | --- |
| `hidden.html`, `solutions/hidden.html`, `solutions/toggle-chip.js` | 1: `<toggle-chip hidden>` that still shows |
| `solutions/form.html`, `solutions/form-toggle-chip.js` | 2: a form-associated chip with `ElementInternals` |
| `solutions/declarative.html` | 3: a shadow root from HTML alone (Declarative Shadow DOM) |
| `solutions/task-item-shadow.ts`, `solutions/compare-styles.mjs` | 4: `<task-item>` with its own shadow root |

For exercise 4, copy `tasklet/lit` (without `node_modules`), replace `src/components/task-item.ts` with
`solutions/task-item-shadow.ts`, run `npm ci && npm run build` there, then
`node solutions/compare-styles.mjs ../../tasklet/lit/dist <copy>/dist`.
