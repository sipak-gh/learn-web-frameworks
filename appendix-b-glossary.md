# Appendix B — Glossary

The terms of art this course uses, in alphabetical order. Each entry gives a short definition and links to
the chapter that explains the idea best. Where a term means different things in different frameworks, the
entry says so.

How to read it:

- A term in *italics* inside a definition has its own entry.
- Abbreviations are listed under the abbreviation (SSR, not "server-side rendering"), with the long form
  first in the definition.
- Framework APIs (`useState`, `$state`, `createSignal` …) aren't listed one by one. For those, see
  [Appendix A](appendix-a-rosetta-stone.md), which puts the same concept side by side in every framework.

[A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [J](#j) ·
[K](#k) · [L](#l) · [M](#m) · [N](#n) · [O](#o) · [P](#p) · [Q](#q) · [R](#r) · [S](#s) · [T](#t) ·
[U](#u) · [V](#v) · [W](#w) · [X](#x) · [Z](#z)

## A

**Acceptance test.** A test that checks behavior from the outside, the way a user sees it, without knowing
how the app is built. Tasklet's 15 Playwright tests are the acceptance test every implementation in this
course must pass. See [Chapter 3](03-the-problem-frameworks-solve.md#the-acceptance-test) and
[Appendix C](appendix-c-tasklet-spec.md).

**Accessible name.** The text that assistive technology announces for an element: a button's label, a
checkbox's `<label>`, or an `aria-label`. The Tasklet tests find elements by role and accessible name, not
by CSS class. See [Chapter 3](03-the-problem-frameworks-solve.md#how-it-finds-things).

**Adapter.** A meta-framework plugin that packages the same app for a specific host or runtime: Node.js, a
static host, Cloudflare, Vercel and others. See
[Chapter 18](18-meta-frameworks-and-rendering.md#edge-and-node-runtimes).

**Aliasing.** Telling the bundler to resolve one package name to another, for example `react` to
`preact/compat`, so that libraries written for React run on Preact. See
[Chapter 9](09-preact.md#preactcompat-and-aliasing).

**Async data.** Data that arrives after the first render, usually from `fetch`. A UI that loads it has to
show loading and error states, and has to ignore a response that arrives after the user has moved on (a
*race condition*). See [Chapter 3](03-the-problem-frameworks-solve.md#async-results-arrive-late) and
[Chapter 16](16-state-routing-and-data.md#server-state-is-a-cache).

**Attributes and properties.** An HTML attribute is a string in the markup (`<input value="a">`); a DOM
property is a JavaScript value on the element object (`input.value`). They often mirror each other but
aren't the same. Custom elements and frameworks have to decide which one to set. See
[Chapter 12](12-lit-and-web-components.md#a-custom-element-with-no-library).

**Autotracking.** Ember's name for automatic *dependency tracking*: properties marked `@tracked` behave like
signals, and getters that read them are derived automatically. See
[Chapter 2](02-a-short-history.md#ember-today-still-shipping).

## B

**Batching.** Grouping several state changes so that dependent work (effects, re-renders, DOM updates) runs
once at the end, not once per change. Some libraries expose an explicit `batch()`; most batch implicitly by
*scheduling* updates. See [Chapter 15](15-reactivity-compared.md#batching-and-scheduling).

**Binding.** A connection between a piece of state and a place in the DOM, kept up to date by the framework.
A one-way binding writes state into the DOM; a *two-way binding* also writes user input back into state.
See [Chapter 3](03-the-problem-frameworks-solve.md#one-way-and-two-way-binding).

**Build step.** Running tools (a compiler, a bundler, a type checker) over your source before the browser
gets it. JSX, single-file components, Svelte and TypeScript all need one; Alpine, htmx, VanJS and Mithril can
run without one. See [Chapter 17](17-build-tools.md#why-bundle-at-all).

**Bundler.** A tool that follows `import` statements from an entry file and combines the modules into a few
optimized files (*chunks*). Vite 8 bundles with Rolldown. See
[Chapter 17](17-build-tools.md#why-bundle-at-all).

## C

**Cache Components.** Next.js 16's caching model: nothing is cached unless you mark a component or function
with the `'use cache'` directive. Next.js prerenders a static shell for each route and streams the uncached
parts in at request time. See
[Chapter 18](18-meta-frameworks-and-rendering.md#isr-and-revalidation).

**Change detection.** Angular's process for finding out what changed and updating the DOM. It used to be
triggered by Zone.js after every async event; in current Angular, signals tell the scheduler which
components need checking (*zoneless*). See [Chapter 7](07-angular.md#the-mental-model).

**Chunk.** One output file of a bundler. Code splitting produces several chunks that load on demand. See
[Chapter 17](17-build-tools.md#inspecting-a-production-build).

**Cleanup function.** A function that undoes what an effect or a component set up: clear a timer, close a
socket, remove a listener. It runs before the effect runs again and when its owner is disposed. See
[Chapter 3](03-the-problem-frameworks-solve.md#cleanup-and-leaks) and
[Chapter 15](15-reactivity-compared.md#ownership-and-cleanup).

**Client Components.** In React Server Components, components marked with `'use client'` that are sent to
the browser as JavaScript and hydrated, as opposed to *Server Components*, which run only on the server. See
[Chapter 18](18-meta-frameworks-and-rendering.md#react-server-components-and-server-functions).

**Client directive.** Astro's attribute that turns a component into an interactive *island* and says when to
hydrate it: `client:load`, `client:idle`, `client:visible` and others. Without one, the component renders
to HTML only. See [Chapter 18](18-meta-frameworks-and-rendering.md#islands).

**Code splitting.** Splitting a bundle into several chunks so that the browser downloads code only when it's
needed, usually at a dynamic `import()` such as a lazy route. See
[Chapter 17](17-build-tools.md#inspecting-a-production-build).

**Commit.** In React, the phase that applies the differences found during *reconciliation* to the real DOM
and then runs Effects. Rendering can be repeated or thrown away; committing can't. See
[Chapter 4](04-react.md#render-reconcile-commit).

**Compiled updates.** The reactivity strategy in which a compiler reads a component's template at build time
and generates code that updates each dynamic spot directly. Svelte is the main example; Solid, Vue Vapor
mode and Angular compile templates too. See [Chapter 15](15-reactivity-compared.md#compiled-updates).

**Component.** A reusable piece of UI with its own inputs (*props*), state and output. Every framework in
this course except htmx is organized around components, though they differ in what a component is at run
time. See [Chapter 3](03-the-problem-frameworks-solve.md#components).

**Composable.** In Vue, a function that uses the Composition API (`ref`, `computed`, `watch` …) to package
reusable stateful logic, named `useSomething` by convention. See
[Chapter 5](05-vue.md#composition-api-and-options-api).

**Composition API and Options API.** Vue's two ways to write a component. The Options API groups code by
kind (`data`, `computed`, `methods`); the Composition API, usually in `<script setup>`, groups it by feature
with functions such as `ref` and `computed`. See [Chapter 5](05-vue.md#composition-api-and-options-api).

**Computed.** A cached value derived from other reactive values, recalculated only when one of its inputs
changes. Called `computed` in Vue, Angular and Preact Signals, `$derived` in Svelte, a *memo* in Solid and
`van.derive` in VanJS. See [Chapter 15](15-reactivity-compared.md#fine-grained-signals).

**Constructable stylesheets.** `CSSStyleSheet` objects created in JavaScript and shared between shadow roots
through `adoptedStyleSheets`, so that many components can use one parsed stylesheet. Lit's `static styles`
uses them. See [Chapter 12](12-lit-and-web-components.md#the-standards).

**Content hash.** A short hash of a file's contents in its name (`index-BeKL5seo.js`). When the contents
change, the name changes, so the file can be cached forever. See
[Chapter 17](17-build-tools.md#inspecting-a-production-build).

**Context.** A way to give a value to every component below a point in the tree without passing it through
each level as props. React and Preact call it context; Vue has `provide`/`inject`; Angular uses *dependency
injection*. See [Appendix A](appendix-a-rosetta-stone.md#context-and-shared-state).

**Controlled input.** A form field whose value always comes from state and whose every change goes through a
handler that updates that state, as in React. The opposite is an uncontrolled field, which keeps its own
value in the DOM. See [Chapter 3](03-the-problem-frameworks-solve.md#one-way-and-two-way-binding).

**Convention over configuration.** A design approach, popularized by Rails and Ember, in which the framework
assumes sensible defaults (file names, folder layout) so that you configure only the exceptions. File-based
routing is a modern example. See
[Chapter 2](02-a-short-history.md#ember-december-2011-conventions-and-a-router-first-app).

**CSP build.** Alpine's alternative build, `@alpinejs/csp`, for pages whose Content Security Policy forbids
`'unsafe-eval'`. It parses attribute expressions with its own small parser instead of creating functions from
strings, so it supports only a subset of JavaScript (no arrow functions, no assignments to properties). See
[Chapter 14](14-alpine.md#the-csp-build).

**CSR (client-side rendering).** The server sends a nearly empty HTML page and a JavaScript bundle; the
browser runs the bundle to build the UI. Every Tasklet except Qwik and htmx renders this way. See
[Chapter 18](18-meta-frameworks-and-rendering.md#csr-and-ssr).

**Custom element.** An HTML element with a name containing a hyphen (`<task-item>`) whose behavior is
defined by a JavaScript class registered with `customElements.define`. One of the Web Components standards.
See [Chapter 12](12-lit-and-web-components.md#a-custom-element-with-no-library).

## D

**Declarative rendering.** Describing what the UI should look like for a given state and letting the
framework work out the DOM operations, instead of writing the operations yourself (imperative code). See
[Chapter 3](03-the-problem-frameworks-solve.md#declarative-rendering).

**Declarative Shadow DOM.** A `<template shadowrootmode="open">` element in HTML that the parser turns into a
shadow root without JavaScript. It lets a server render custom elements with their shadow DOM in place. See
[Chapter 12](12-lit-and-web-components.md#server-rendering-and-declarative-shadow-dom).

**Deep reactivity.** Making nested objects and arrays reactive, so that `tasks[0].done = true` or
`tasks.push(t)` triggers updates without replacing the whole value. Vue, Svelte's `$state` and Alpine
implement it with JavaScript Proxies. See [Chapter 6](06-svelte.md#deep-reactivity).

**Dependency graph.** The network of signals, computeds and effects, connected by which one reads which. A
signal library keeps this graph up to date and uses it to decide what to rerun after a change. See
[Chapter 15](15-reactivity-compared.md#fine-grained-signals).

**Dependency injection (DI).** A pattern in which a class declares what it needs (a service, a value) and a
container provides it, instead of the class creating it. Angular is built around it: `inject(TaskStore)`
asks the injector for the shared instance. See
[Chapter 7](07-angular.md#decorators-classes-and-dependency-injection).

**Dependency tracking.** Recording which reactive values a computation reads while it runs, so that it can be
rerun when exactly those values change. Automatic tracking is what lets signals work without dependency
arrays. See [Chapter 15](15-reactivity-compared.md#dependency-tracking).

**Derived state.** A value computed from other state, such as "tasks left" from the task list. Storing it
separately invites bugs; computing it (and caching it with a *computed* or *memo*) keeps it consistent. See
[Chapter 3](03-the-problem-frameworks-solve.md#state-derived-state-and-one-way-data-flow).

**Development server.** A local server that serves your source files to the browser during development,
transforming them on request (TypeScript, JSX, SFCs) and pushing updates with HMR. Vite's is the default for
most frameworks in this course. See [Chapter 17](17-build-tools.md#the-development-server).

**DI.** See *dependency injection*.

**Diamond problem.** The dependency shape in which two computeds depend on the same signal and a third
depends on both. A naive push-based implementation runs the third one twice, once with a half-updated pair:
a *glitch*. See [Chapter 15](15-reactivity-compared.md#glitches-and-the-diamond).

**Diffing.** Comparing two versions of something (two virtual DOM trees, two lists of keys) to find the
smallest set of changes. See *reconciliation*, and
[Chapter 15](15-reactivity-compared.md#re-render-and-diff).

**Digest cycle.** See *dirty checking*.

**Directive.** A special attribute that attaches behavior to an element. AngularJS introduced the term; Vue
(`v-if`, `v-model`), Alpine (`x-data`, `x-show`) and Angular (`ngModel`, attribute directives) use it today,
and Svelte's `bind:` and `use:` play the same role. See [Chapter 14](14-alpine.md#behavior-in-attributes)
and [Chapter 5](05-vue.md#anatomy-of-a-single-file-component).

**Dirty checking.** Finding changes by comparing the current value of every watched expression with the
value it had last time. AngularJS did this in its *digest cycle*, which ran watchers repeatedly until nothing
changed. See
[Chapter 2](02-a-short-history.md#angularjs-october-2010-two-way-binding-and-dirty-checking).

**DOM ref.** A reference to an actual DOM element that a component rendered, for things declarative
rendering can't express, such as focusing an input. See
[Appendix A](appendix-a-rosetta-stone.md#dom-refs).

## E

**Edge runtime.** A JavaScript runtime that runs in many data centers close to users, such as Cloudflare
Workers, built on V8 isolates with web-standard APIs (`fetch`, `Request`, `Response`) and limited Node.js
APIs, CPU time and memory. The alternative is a Node.js server in one region. See
[Chapter 18](18-meta-frameworks-and-rendering.md#edge-and-node-runtimes).

**Effect.** Code that reaches outside the reactive system (writing to the DOM, `localStorage`, the network,
a timer) and reruns when the values it depends on change. React's `useEffect` runs after commit and declares
its dependencies in an array; signal libraries track them automatically. See
[Chapter 3](03-the-problem-frameworks-solve.md#effects-and-lifecycle) and
[Chapter 15](15-reactivity-compared.md#fine-grained-signals).

**Equality cutoff.** Stopping propagation when a recomputed value is equal to the previous one (by `===` or
`Object.is`, or a custom `equals`), so that nothing downstream reruns. It is what makes derived state cheap.
See [Chapter 15](15-reactivity-compared.md#equality-and-cutoff).

**Event replay.** Recording user events that arrive before hydration has finished and dispatching them once
the page is interactive. React does it for Suspense boundaries, and Angular calls its version event replay.
See [Chapter 18](18-meta-frameworks-and-rendering.md#hydration-and-its-cost).

**Events out.** The way a child component tells its parent that something happened: a callback prop (React,
Solid, Preact, Svelte 5), an emitted event (Vue `emit`, Angular `output()`) or a DOM `CustomEvent` (Lit,
Web Components). See [Appendix A](appendix-a-rosetta-stone.md#events-out).

## F

**File-based routing.** Deriving the routes of an app from its folder and file layout
(`src/routes/tasks/[id]/+page.svelte`, `app/tasks/[id]/page.tsx`), as meta-frameworks do, instead of
declaring them in code. See
[Chapter 16](16-state-routing-and-data.md#file-based-routing-in-meta-frameworks).

**Fine-grained reactivity.** Updating exactly the DOM nodes that depend on a changed value, without
re-running a whole component. Signals are the usual way to get it; Solid, Svelte 5, Preact Signals' direct
bindings, VanJS, Qwik and Angular's signals all work this way. See
[Chapter 15](15-reactivity-compared.md#fine-grained-signals).

**Form-associated custom element.** A custom element that takes part in a `<form>` like a built-in field:
it has a value that is submitted, validity and a label, through `static formAssociated = true` and
`ElementInternals`. See [Chapter 12](12-lit-and-web-components.md#the-standards).

**Formatter.** A tool that rewrites code into a consistent layout (Prettier, Biome, oxfmt) and doesn't
change its meaning. Compare *linter*. See [Chapter 17](17-build-tools.md#linters-and-formatters).

**Fragment.** A piece of HTML that isn't a whole page, such as one `<li>` or a list. htmx servers respond to
most requests with fragments, which htmx swaps into the page. (React and Vue also use "fragment" for a
wrapper that groups children without adding a DOM element.) See [Chapter 13](13-htmx.md#the-exchange).

## G

**Glitch.** A moment when some code sees a half-updated reactive graph, one input already new and another
still old, and briefly shows or acts on an inconsistent value. Signal libraries avoid glitches by
recomputing in dependency order or by pulling values lazily. See
[Chapter 15](15-reactivity-compared.md#glitches-and-the-diamond).

## H

**HATEOAS.** "Hypermedia as the Engine of Application State", a REST constraint from Roy Fielding's 2000
dissertation: the client needs no knowledge of the application beyond how to read hypermedia, because every
action it can take next arrives in the response as a link or form. htmx is built on it. See
[Chapter 13](13-htmx.md#hypermedia-and-hateoas).

**HMR (hot module replacement).** A development-server feature that replaces a changed module in the running
page without a full reload, often keeping component state. See
[Chapter 17](17-build-tools.md#hot-module-replacement).

**Hooks.** React's functions for using state and other features inside function components (`useState`,
`useEffect`, `useMemo` …). The Rules of Hooks require calling them at the top level of a component or custom
hook, in the same order on every render. See [Chapter 4](04-react.md#hooks-and-their-rules).

**hx-boost.** The htmx attribute that turns ordinary links and forms inside an element into htmx requests:
htmx fetches the target page, swaps in its `<body>`, updates the title and pushes the URL. See
[Chapter 13](13-htmx.md#hx-boost).

**Hydration.** Making server-rendered HTML interactive: the browser downloads the components, runs them again
to rebuild the framework's internal state, and attaches event listeners to the existing DOM. If the client
renders something different from the server, the framework reports a **hydration mismatch**. See
[Chapter 18](18-meta-frameworks-and-rendering.md#hydration-and-its-cost) and
[Chapter 11](11-qwik.md#hydration-versus-resumability).

**Hydration mismatch.** See *hydration*.

**Hypermedia.** Media, such as HTML, that contains controls (links, forms) telling the client what it can
do next and where to send the request. A **hypermedia control** is one of those elements; htmx lets any
element be one. See [Chapter 13](13-htmx.md#hypermedia-and-hateoas).

**Hyperscript.** Building UI with nested function calls such as `m('li', { class: 'task' }, title)` instead
of HTML-like templates. Mithril's `m()` and VanJS's tag functions (`li({ class: 'task' }, title)`) are
hyperscript; JSX compiles to it. (Not to be confused with `_hyperscript`, a scripting language from the htmx
authors.) See [Chapter 10](10-mithril-and-the-minimalists.md#hyperscript-and-tag-functions).

## I

**Hypermedia control.** See *hypermedia*.

**Import map.** A `<script type="importmap">` element that tells the browser which URL a bare module
specifier such as `import van from 'vanjs-core'` refers to, so that native ES modules can use packages
without a bundler. See [Chapter 17](17-build-tools.md#no-build-native-modules-and-import-maps).

**Incremental hydration.** Angular's name for hydrating `@defer` blocks only when a trigger fires
(`@defer (hydrate on viewport)`); until then the block is inert and its code isn't downloaded. A form of
*progressive hydration*. See [Chapter 18](18-meta-frameworks-and-rendering.md#progressive-and-partial-hydration).

**Islands.** An architecture in which the page is static HTML with a few interactive regions, the islands,
each hydrated on its own with its own trigger. The rest of the page ships no JavaScript. Astro is the main
example. Astro's **server islands** turn the idea around: one component (`server:defer`) is rendered on the
server after the cached static page has been sent. See [Chapter 18](18-meta-frameworks-and-rendering.md#islands).

**ISR (incremental static regeneration).** A page is rendered once and cached; after a set time it counts as
stale, and the next request gets the stale copy while the server re-renders it in the background. It sits
between SSG and SSR. See [Chapter 18](18-meta-frameworks-and-rendering.md#isr-and-revalidation).

## J

**JSX.** An extension of JavaScript syntax that lets you write HTML-like tags in code
(`<li class="task">{title}</li>`). A compiler turns each tag into a function call: `createElement` in
React and Preact, real DOM creation in Solid, Qwik's own `jsx` function. See
[Chapter 3](03-the-problem-frameworks-solve.md#templates-jsx-tagged-templates-hyperscript).

## K

**Key.** A stable identity attached to each item of a rendered list (`key={task.id}`, `track task.id`,
`(task.id)`) so that the framework can match old items to new ones, move their DOM nodes and keep their
state, instead of patching by position. A list rendered this way is a **keyed list**. See
[Chapter 3](03-the-problem-frameworks-solve.md#lists-rebuild-or-patch) and
[Appendix A](appendix-a-rosetta-stone.md#lists-with-keys).

**Keyed list.** See *key*.

## L

**Lazy hydration.** See *progressive hydration*.

**Lazy route.** A route whose component is loaded with a dynamic `import()` the first time the user visits
it, so that its code is a separate chunk. See [Chapter 16](16-state-routing-and-data.md#routing).

**Lifecycle.** The stages a component goes through: created, mounted (inserted into the DOM), updated and
unmounted (removed). Frameworks let you run code at these points, for example to set something up on mount
and clean it up on unmount. See [Chapter 3](03-the-problem-frameworks-solve.md#effects-and-lifecycle) and
[Appendix A](appendix-a-rosetta-stone.md#mount-and-cleanup).

**Light DOM.** The ordinary DOM children of an element, as opposed to its shadow DOM. A Lit component that
renders into the light DOM (by returning `this` from `createRenderRoot`) can be styled by page CSS. See
[Chapter 12](12-lit-and-web-components.md#shadow-dom-or-not).

**Linter.** A tool that analyzes code for likely bugs and style problems without running it (ESLint, Oxlint,
Biome). Framework plugins add rules such as React's Rules of Hooks. See
[Chapter 17](17-build-tools.md#linters-and-formatters).

**lit-html.** Lit's template library: `html` tagged templates that render to the DOM and, on later renders,
update only the dynamic parts. See
[Chapter 12](12-lit-and-web-components.md#lit-reactive-properties-batched-updates-template-parts).

**Locality of behavior.** The principle, named by htmx's author Carson Gross, that the behavior of a piece of
code should be visible by looking at that piece of code, for example as attributes on the element it
affects. See [Chapter 13](13-htmx.md#locality-of-behavior).

## M

**Memo.** A cached derived value. In Solid, `createMemo` is a computed signal. In React, `useMemo` caches a
value between renders and `memo()` skips re-rendering a component whose props haven't changed; the React
Compiler inserts that kind of memoization for you. See
[Chapter 8](08-solid.md#signals-memos-and-effects) and [Chapter 4](04-react.md#the-react-compiler).

**Meta-framework.** A framework built on top of a UI framework that adds routing, server rendering, data
loading, a build setup and deployment adapters: Next.js and React Router for React, Nuxt for Vue,
SvelteKit, SolidStart, Analog for Angular, Qwik City, Astro. See
[Chapter 18](18-meta-frameworks-and-rendering.md#what-a-meta-framework-adds).

**Mount.** Inserting a component's DOM into the page for the first time; unmounting removes it. See
*lifecycle*.

**MPA (multi-page application).** A site in which each navigation loads a new HTML page from the server.
The opposite of an *SPA*. htmx apps are MPAs that update parts of the page in place. See
[Chapter 3](03-the-problem-frameworks-solve.md#spa-and-mpa).

## N

**Nested routes.** Routes that render inside a parent route's layout, so that `/tasks/42` shows the task
inside the `/tasks` page and only the inner part changes on navigation. See
[Chapter 16](16-state-routing-and-data.md#routing).

## O

**Observable.** A value or stream that notifies subscribers when it changes. Knockout's observables (2010)
were an early form of signals; RxJS Observables, which Angular uses for HTTP and streams, model sequences of
events over time. See
[Chapter 2](02-a-short-history.md#knockout-july-2010-observables-and-automatic-dependency-tracking) and
[Chapter 7](07-angular.md#httpclient-and-rxjs).

**One-way data flow.** State lives in one place and flows down through props; children report changes up
through events instead of modifying the parent's state, so every change to a piece of state starts in the
component that owns it.
See [Chapter 3](03-the-problem-frameworks-solve.md#state-derived-state-and-one-way-data-flow).

**OnPush.** An Angular change detection strategy that checks a component only when its inputs change, an
event fires inside it or a signal it reads changes. It is the default for new components since Angular 22.
See [Chapter 7](07-angular.md#the-mental-model).

**OOB swap (out-of-band swap).** An htmx response element marked `hx-swap-oob="true"` with an `id`; htmx
uses it to replace the element with that id wherever it is on the page, while the rest of the response goes
to the normal target. It lets one request update several parts of the page. See
[Chapter 13](13-htmx.md#the-attribute-model).

**Optimizer.** Qwik's compiler, a Rust-based Vite plugin that finds each `$` in your code and moves the
function into its own module (a *segment*), leaving a *QRL* in its place. See
[Chapter 11](11-qwik.md#-marks-where-the-code-can-be-split).

**Owner.** See *ownership*.

**Ownership.** Organizing reactive computations in a tree: every effect created while another computation
runs is owned by it, and is disposed when its **owner** reruns or is disposed. It is how signal libraries
clean up effects without a component lifecycle. See
[Chapter 15](15-reactivity-compared.md#ownership-and-cleanup) and
[Chapter 8](08-solid.md#ownership-and-cleanup).

## P

**Partial hydration.** Hydrating only the components that need to be interactive and never sending the code
of the rest to the browser. Islands and React Server Components are two ways to decide which components
those are. See [Chapter 18](18-meta-frameworks-and-rendering.md#progressive-and-partial-hydration).

**Post/Redirect/Get (PRG).** Answering a form POST with a redirect (`303 See Other`) to a page that the
browser then loads with GET, so that a reload doesn't submit the form again. The htmx Tasklet uses it when
JavaScript is off. See [Chapter 13](13-htmx.md#progressive-enhancement).

**Progressive enhancement.** Building a page that works with plain HTML first and adding JavaScript as a
layer on top, so that it still works, perhaps less smoothly, when the script is missing. See
[Chapter 13](13-htmx.md#progressive-enhancement).

**Progressive hydration.** Hydrating the whole page in pieces and on triggers (visible, idle, interaction)
instead of all at once. Also called lazy hydration; Angular calls its version *incremental hydration*. See
[Chapter 18](18-meta-frameworks-and-rendering.md#progressive-and-partial-hydration).

**Props.** The inputs a parent passes to a child component, like arguments to a function. A child shouldn't
modify its props; it asks the parent through an event or callback instead. Angular calls them inputs, Lit
calls them properties. See [Chapter 3](03-the-problem-frameworks-solve.md#components) and
[Appendix A](appendix-a-rosetta-stone.md#props-in).

**Proxy.** A JavaScript object that wraps another and intercepts reads and writes. Vue, Svelte 5 and Alpine
use Proxies for *deep reactivity*: reading a property records a dependency, writing one triggers updates.
See [Chapter 14](14-alpine.md#vues-reactivity-under-the-hood).

**Push, pull and push-pull.** Three ways to propagate changes through a reactive graph. Push recomputes
dependents as soon as a source changes; pull recomputes a value only when it is read; push-pull pushes a
cheap "might be stale" notification and pulls values on demand. Modern signal libraries use push-pull. See
[Chapter 15](15-reactivity-compared.md#push-pull-and-push-pull).

## Q

**QRL (Qwik URL).** A serializable reference to a lazily loadable function: which chunk, which export, and
the variables the function captured. Qwik writes QRLs into the HTML so that the browser can load a handler
only when its event fires. See [Chapter 11](11-qwik.md#-marks-where-the-code-can-be-split).

**Qwik City.** Qwik's meta-framework: folder-based routes in `src/routes/`, layouts, and server-side
data tools such as `routeLoader$`, whose results are serialized into the page. See
[Chapter 11](11-qwik.md#qwik-city).

## R

**Race condition.** A bug in which the result depends on the order in which async operations finish, for
example an old request that returns after a newer one and overwrites its result. See
[Chapter 3](03-the-problem-frameworks-solve.md#async-results-arrive-late).

**React Compiler.** A build-time compiler for React that analyzes components and inserts memoization
automatically, so that you rarely need `useMemo`, `useCallback` or `memo`. It doesn't change React's
re-render model. See [Chapter 4](04-react.md#the-react-compiler).

**Reactive controller.** In Lit, an object that hooks into its host element's lifecycle and can request
updates, packaging reusable behavior. `Task` from `@lit/task`, which Tasklet uses for the fetch, is one. See
[Chapter 12](12-lit-and-web-components.md).

**Reactive property.** In Lit, a class field declared with `@property()` (public, settable from an attribute)
or `@state()` (internal) whose changes schedule an update of the element. Updates are batched into one
render per microtask. See
[Chapter 12](12-lit-and-web-components.md#lit-reactive-properties-batched-updates-template-parts).

**Reactivity.** Keeping the UI (and other derived values) in sync with state automatically when the state
changes. The course groups the strategies into three families: re-render and diff, fine-grained signals and
compiled updates. See [Chapter 3](03-the-problem-frameworks-solve.md#reactivity-three-strategies) and
[Chapter 15](15-reactivity-compared.md).

**Reconciler.** See *reconciliation*.

**Reconciliation.** Comparing a newly rendered tree (the virtual DOM) with the previous one and working out
which DOM changes are needed. The code that does it is the **reconciler**. See
[Chapter 4](04-react.md#render-reconcile-commit) and
[Chapter 15](15-reactivity-compared.md#re-render-and-diff).

**Re-render.** Running a component function again to produce a new description of its UI. In React, Preact
and Mithril that is how every update happens; in Solid, Svelte 5 and other fine-grained frameworks a
component runs only once. See [Chapter 15](15-reactivity-compared.md#re-render-and-diff) and
[Chapter 8](08-solid.md#components-run-once).

**Resource.** A reactive wrapper around an async operation that exposes its value, loading state and error,
and can be reloaded: Solid's `createResource`, Angular's `resource` and `httpResource`, Qwik's
`useResource$`, and (as a controller) Lit's `Task`. See
[Chapter 11](11-qwik.md#useresource-and-async-state) and
[Appendix A](appendix-a-rosetta-stone.md#async-data).

**Resumability.** Qwik's alternative to hydration: the server serializes the application state, the
component boundaries and the event handlers' locations into the HTML, and the browser continues from there
without re-running any component. Code loads only when an event needs it. See
[Chapter 11](11-qwik.md#hydration-versus-resumability) and
[Chapter 18](18-meta-frameworks-and-rendering.md#resumability).

**RSC (React Server Components).** A React architecture in which components run on the server by default,
can be `async` and read data directly, and send no code to the browser; only components marked
`'use client'` (Client Components) are hydrated. See
[Chapter 18](18-meta-frameworks-and-rendering.md#react-server-components-and-server-functions) and
[Chapter 4](04-react.md#server-components-in-one-paragraph).

**Runes.** Svelte 5's compiler instructions that look like function calls: `$state`, `$derived`, `$effect`,
`$props`, `$bindable`. They replaced Svelte 4's reactive `let` and `$:` statements. See
[Chapter 6](06-svelte.md#runes-and-what-they-replaced).

## S

**Scheduling.** Deciding when updates and effects run: synchronously during a write, in a microtask, or
before the next frame. Scheduling is how most frameworks batch implicitly. See
[Chapter 15](15-reactivity-compared.md#batching-and-scheduling).

**Scoped styles.** CSS that applies only to one component's markup. Vue (`<style scoped>`), Svelte and
Angular rewrite selectors with generated attributes or classes; Lit uses shadow DOM; the others use conventions or
CSS modules. Tasklet uses one global stylesheet. See
[Appendix A](appendix-a-rosetta-stone.md#scoped-styles).

**Segment.** A module that Qwik's optimizer extracts from a `$` function (older docs say "symbol"). See
[Chapter 11](11-qwik.md#-marks-where-the-code-can-be-split).

**Serialization.** Turning in-memory values into text, such as JSON, that can be sent to the browser and
turned back into values there. SSR frameworks serialize data for hydration (Nuxt calls it the payload); Qwik
serializes the whole app state and so can't send closures or arbitrary class instances. See
[Chapter 11](11-qwik.md#serialization-is-the-price).

**Server Components.** See *RSC*.

**Server functions.** Server-side `async` functions marked `'use server'` that a Client Component can call
or use as a form's `action`. The framework turns each into an HTTP endpoint and the call into a `fetch`, so
treat them as public endpoints. See
[Chapter 18](18-meta-frameworks-and-rendering.md#react-server-components-and-server-functions).

**Server islands.** See *islands*.

**Server state.** A local copy of data that the server owns and other users can change. It arrives
asynchronously and goes stale, so it is best handled as a cache (TanStack Query, SWR, router loaders), not
as a store. See [Chapter 16](16-state-routing-and-data.md#server-state-is-a-cache).

**SFC (single-file component).** One file holding a component's template, script and styles, such as a
`.vue` file with `<template>`, `<script setup>` and `<style scoped>` blocks. Svelte components are SFCs too.
See [Chapter 5](05-vue.md#anatomy-of-a-single-file-component).

**Shadow DOM.** A hidden DOM tree attached to an element (its shadow root), whose styles and ids are
isolated from the page. Page CSS doesn't reach inside, and inner styles don't leak out, apart from inherited
properties and CSS custom properties. See [Chapter 12](12-lit-and-web-components.md#shadow-dom-or-not).

**Signal.** A reactive value that knows who has read it and notifies them when it changes. Signals are the
building block of fine-grained reactivity in Solid, Preact Signals, Angular, Qwik, VanJS, Svelte 5 (behind
runes) and Vue (where they are called refs). See
[Chapter 15](15-reactivity-compared.md#fine-grained-signals) and
[Chapter 8](08-solid.md#signals-memos-and-effects).

**Signal Forms.** Angular's form API, stable since Angular 22: `form(model)` turns a signal of plain data into
a tree of fields, `[formField]` binds a field to an input in both directions, and validation rules go in a
schema function. See [Chapter 7](07-angular.md#forms).

**Signals proposal.** A TC39 proposal to add a signal primitive (`Signal.State`, `Signal.Computed`) to
JavaScript, meant for libraries to build on. It reached Stage 1 in April 2024 and is still there. See
[Chapter 15](15-reactivity-compared.md#the-tc39-signals-proposal).

**Slot.** A placeholder in a component where the parent's content is rendered. Web Components use
`<slot>` elements in the shadow root, Vue has `<slot>` and named slots, and Svelte 5 replaced its slots with
*snippets*. See [Chapter 12](12-lit-and-web-components.md#the-standards).

**Snippet.** In Svelte 5, a named, typed piece of markup declared with `{#snippet name(params)}` and
rendered with `{@render name(args)}`. Snippets are values and can be passed as props. See
[Chapter 6](06-svelte.md#snippets-instead-of-slots).

**Source map.** A `.map` file that maps positions in generated or minified code back to the original source,
so that the browser's devtools show `src/main.ts`, not the bundle. See
[Chapter 17](17-build-tools.md#inspecting-a-production-build).

**SPA (single-page application).** An app that loads one HTML page and then renders every view in the
browser, intercepting navigation and fetching data with JavaScript. See
[Chapter 3](03-the-problem-frameworks-solve.md#spa-and-mpa).

**SSG (static site generation).** Rendering pages to HTML files at build time, so that any static host can
serve them. The Qwik Tasklet is built this way. See
[Chapter 18](18-meta-frameworks-and-rendering.md#ssg-static-site-generation).

**SSR (server-side rendering).** Running the components on the server for each request and sending finished
HTML, which the browser can paint before any JavaScript runs. Unless the framework is resumable, the page
then hydrates. See [Chapter 18](18-meta-frameworks-and-rendering.md#csr-and-ssr).

**Stale-while-revalidate.** Serving a cached copy immediately, even if it is out of date, and refreshing it
in the background. It is an HTTP `Cache-Control` directive, the idea behind ISR, and the default behavior of
TanStack Query and SWR. See [Chapter 16](16-state-routing-and-data.md#tanstack-query).

**Store.** A container for shared client state that lives outside the component tree, which components
subscribe to: Pinia, Zustand, Redux Toolkit, NgRx Signal Store, Solid stores, Alpine's `Alpine.store`, or a
module exporting signals. See [Chapter 16](16-state-routing-and-data.md#five-kinds-of-state).

**Streaming SSR.** Sending server-rendered HTML in chunks as it becomes ready, so that the browser can paint
the page shell while slower parts (usually behind Suspense boundaries) are still rendering. See
[Chapter 18](18-meta-frameworks-and-rendering.md#streaming-ssr).

**Strict Mode.** React's development-only `<StrictMode>` wrapper, which renders every component twice and
runs every Effect setup and cleanup an extra time so that impure code shows up as a visible bug. See
[Chapter 4](04-react.md#render-reconcile-commit).

**Suspense.** A boundary component (`<Suspense fallback={…}>` in React and Solid) that shows a fallback while
something inside it is loading. In streaming SSR, each boundary can be sent and hydrated separately. See
[Chapter 18](18-meta-frameworks-and-rendering.md#streaming-ssr).

## T

**Tagged template.** A template literal with a function name in front (``html`<li>${title}</li>` ``); the
function receives the static strings and the values separately. Lit's `html` uses it to know which parts of a
template can change. See [Chapter 3](03-the-problem-frameworks-solve.md#templates-jsx-tagged-templates-hyperscript).

**Tasklet.** The small task-list app that this course builds thirteen times, once per framework, against one
DOM contract and one Playwright acceptance test. Its manifest, **`tasklet.json`**, tells the test harness
how to build, serve and test each implementation. See
[Chapter 3](03-the-problem-frameworks-solve.md#tasklet-one-app-thirteen-times) and
[Appendix C](appendix-c-tasklet-spec.md).

**Template.** The markup part of a component, written in an HTML-based syntax that the framework compiles
(Vue, Svelte, Angular) or interprets (Alpine), as opposed to JSX or hyperscript written in JavaScript. See
[Chapter 3](03-the-problem-frameworks-solve.md#templates-jsx-tagged-templates-hyperscript).

**`<template>` element.** An HTML element whose content is parsed but not rendered, ready to be cloned.
Lit, Solid and Svelte clone templates to create DOM quickly; with `shadowrootmode` it becomes declarative
shadow DOM. See [Chapter 12](12-lit-and-web-components.md#the-standards).

**Tracking scope.** The context in which signal reads are recorded as dependencies: inside an effect, a
computed or a template binding. Reading a signal elsewhere, such as in an event handler, returns its value
without subscribing. See [Chapter 15](15-reactivity-compared.md#dependency-tracking).

**Transpiling.** Converting source from one form of JavaScript to another, such as TypeScript or JSX to
plain JavaScript. Most build tools, Vite and esbuild included, handle TypeScript by stripping the types
without checking them, so the type check is a separate step (`tsc`, `vue-tsc`, `svelte-check`). See
[Chapter 17](17-build-tools.md#transpiling-is-not-type-checking).

**Tree shaking.** Removing exports that nothing imports from the bundle. It works only when removing the code
can't change behavior, which libraries signal with `/* @__PURE__ */` annotations and `"sideEffects": false`.
See [Chapter 17](17-build-tools.md#inspecting-a-production-build).

**Two-way binding.** A binding that writes state into a form field and writes the user's input back into
state: `v-model`, `bind:value`, `x-model`, Angular's `[formField]` or `[(ngModel)]`. See
[Chapter 3](03-the-problem-frameworks-solve.md#one-way-and-two-way-binding) and
[Appendix A](appendix-a-rosetta-stone.md#two-way-binding-and-form-input).

## U

**Uncanny valley.** The time between a server-rendered page appearing and hydration finishing, when it looks
ready but clicks are lost or delayed. See
[Chapter 18](18-meta-frameworks-and-rendering.md#hydration-and-its-cost).

**Untrack.** Reading a signal without recording a dependency (`untrack` in Solid and Svelte, `untracked` in
Angular, `peek()` in Preact Signals), so that the surrounding effect doesn't rerun when it changes.
See [Chapter 15](15-reactivity-compared.md#what-a-real-library-adds), whose Exercise 2 adds it to the
chapter's signal library.

**URL state.** State kept in the URL's path or query string, such as `?filter=active`, so that it survives a
reload, works with Back and Forward, and can be shared as a link. See
[Chapter 16](16-state-routing-and-data.md#the-url-is-state-too).

## V

**Vapor mode.** A compilation mode coming in Vue 3.6 that generates direct DOM operations driven by signals
instead of a render function that returns virtual DOM nodes. Vue 3.6 is at release candidate as of
November 2026. See [Chapter 5](05-vue.md#vapor-mode-and-vue-36).

**VDOM (virtual DOM).** A tree of plain JavaScript objects describing what the UI should look like. A
re-render produces a new tree, and the framework diffs it against the old one to update the real DOM. React,
Preact, Vue and Mithril use one. See [Chapter 2](02-a-short-history.md#react-and-the-virtual-dom-2013) and
[Chapter 15](15-reactivity-compared.md#re-render-and-diff).

## W

**Web Components.** The browser standards for building reusable elements without a framework: custom
elements, shadow DOM, `<template>` and `<slot>`. Lit is a thin layer over them. See
[Chapter 12](12-lit-and-web-components.md#the-standards).

## X

**x-cloak.** An Alpine attribute removed when Alpine initializes the element. With a CSS rule such as
`[x-cloak] { display: none }`, it hides parts of the page that shouldn't flash before Alpine runs. See
[Chapter 14](14-alpine.md#behavior-in-attributes).

## Z

**Zone.js.** A library that patches browser async APIs (`setTimeout`, promises, events) so that Angular
learns when anything async has finished and can run change detection. Angular no longer needs it. See
[Chapter 7](07-angular.md#why-it-exists).

**Zoneless.** Angular change detection without Zone.js, driven by signals and explicit notifications. Stable
since Angular 20.2 and the default for new apps since Angular 21. See
[Chapter 7](07-angular.md#why-it-exists).
