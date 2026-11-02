# Chapter 10 examples

Mithril and VanJS exercises for [Chapter 10](../../10-mithril-and-the-minimalists.md). The pages load the
libraries straight from `node_modules/` (Mithril as a classic script, VanJS through an import map), so there
is no build step.

```sh
npm ci
npx playwright install chromium   # once, if Chromium isn't installed yet
npm run verify                    # opens every page in headless Chromium and prints what happened
npm run measure                   # minified, gzip and brotli sizes of the libraries
```

| File | Exercise |
| --- | --- |
| `clock.html`, `solutions/clock.html` | 1: a timer that doesn't redraw, and the fix with `m.redraw()` |
| `solutions/route.html` | 2: the filter in the URL with `m.route` and a route resolver |
| `lifecycle.html` | 3: the order of Mithril's lifecycle methods |
| `solutions/van-core-list.html`, `solutions/vanx-list.html` | 4: a list with VanJS core only, and with VanX |
| `measure.mjs` | 5: check the size claims yourself |

`verify.mjs` serves the folder through a routed fake origin (`http://ch10.test`), so ES modules load as they
would over HTTP without starting a server.
