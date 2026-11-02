# Chapter 2 examples

The same tiny list (type an item, press Add, see the count) in jQuery, Backbone, Knockout, AngularJS and React,
for [Chapter 2](../../02-a-short-history.md).

```sh
npm ci          # installs the pinned library versions into node_modules/
npm run build   # compiles the two React examples' JSX into build/
```

Then open any `.html` file in this folder (or in `solutions/`) directly in a browser; no server is needed.

These are old libraries kept for history: `npm audit` reports advisories for AngularJS (end of life since
January 2022) and for React 15's server-side fetch dependency, which the browser examples never load.
Do not copy these versions into a new project.
