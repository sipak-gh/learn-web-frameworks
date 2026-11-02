# Chapter 11 examples

Qwik exercises for [Chapter 11](../../11-qwik.md). These scripts run Qwik's optimizer and server renderer on
single component files, so you can see what Qwik does to a component without creating a project.

```sh
npm ci
node optimize.mjs counter.tsx --code         # the segments the optimizer splits a component into
node render.mjs price.tsx Price              # server-render a component (this one fails on purpose)
node render.mjs solutions/price.tsx Price    # the fixed version, with its serialized state
node inspect.mjs ../../tasklet/qwik/dist/index.html   # what Qwik Tasklet's prerendered page carries
```

| File | Exercise |
| --- | --- |
| `counter.tsx`, `optimize.mjs` | 1: find the `$` boundaries |
| `price.tsx`, `solutions/price.tsx`, `render.mjs` | 2: a value that can't be serialized, and the fix |
| `inspect.mjs` | 3: read a resumable page (build `tasklet/qwik` first) |

`render.mjs` starts Vite in middleware mode with Qwik's plugin and calls `renderToString` from
`@builder.io/qwik/server`, the way a Qwik City dev server does. It runs in development mode, which is why the
output carries `q:render="ssr-dev"` and `data-qwik-inspector` attributes.
