# Chapter 20 — Choosing a Framework

[Chapter 19](19-comparing-frameworks.md) set thirteen implementations side by side: sizes, source lines,
benchmarks, surveys, governance and release records. None of that tells you what to use, because the right
choice depends on the project, the people building it and how long it has to last. This chapter turns the
comparison into decisions. It starts with the questions that actually separate the options, puts them into an
ASCII decision flow, and gives you a small script that records your judgments as a weighted matrix and tells
you when the result is too close to call. Then it works through eleven common scenarios, from a
documentation site to an offline-first app, with a recommendation, a runner-up and the reasons against the
obvious alternatives for each.

The rest of the chapter is about time: the argument for boring choices, how to migrate an existing app one
piece at a time, and how to evaluate a framework this course doesn't cover by building Tasklet in it. It ends
with where to go next. After this chapter come the appendices: [Appendix A](appendix-a-rosetta-stone.md)
shows the same concepts in every framework side by side, [Appendix B](appendix-b-glossary.md) defines the
terms the course uses, and [Appendix C](appendix-c-tasklet-spec.md) specifies Tasklet so you can build it
again in something new.

## Most choices are fine

Start with a fact that the rest of the chapter depends on: for most projects, several frameworks in this
course would work. All thirteen Tasklet apps pass the same acceptance suite (htmx skips, by design, the six
tests about client-side loading and storage). All the major frameworks render a typical screen faster than a
person can notice, as the js-framework-benchmark showed in
[Chapter 19](19-comparing-frameworks.md#the-js-framework-benchmark). All of them have shipped products that
millions of people use. Teams rarely fail because they picked Vue instead of Svelte. They fail because they
picked something nobody knew under a deadline, built a client-rendered app for content that should have been
HTML, or rewrote a working app to follow a trend.

So the goal is not to find the best framework. It is to avoid a bad fit, then pick the good fit your team
will be most productive with for the life of the project. The questions that matter most are therefore about
your situation, and when two options come out close, decide on something specific (the team's experience, a
library you need, an existing backend) rather than on a benchmark.

## The questions to ask

Nine questions separate the options. Ask them roughly in this order, because the early ones often settle the
matter before you get to the later ones.

### 1. What does your team already know?

The strongest predictor of how fast a team ships is whether it already knows the tools. A team of React
developers will build a dashboard in React faster than in Solid, even though Solid's model is simpler in
some ways ([Chapter 8](08-solid.md)), because they know the libraries, the debugging tools and the failure
modes. A new framework costs weeks before a team is productive and months before it writes idiomatic code.
Pay that cost when the new framework solves a problem the current one can't.

The exception is a team that knows a framework badly suited to the job. A React team asked to build a
content site doesn't need to give up React, but it should reach for Astro or a static-first setup rather than
a client-rendered single-page app.

### 2. Who will you hire, and who will maintain it?

A project outlives its first team. If you will hire, the size of the pool matters: in the Stack Overflow 2026
survey, 41.5% of developers who answered the question use React, 17.2% Vue, 16.0% Angular, 7.8% Svelte and
1.5% Solid ([Chapter 19](19-comparing-frameworks.md#stack-overflow-developer-survey-2026)). A smaller pool
isn't fatal, since good developers learn a new framework quickly, but it changes how long hiring takes and
how much onboarding you plan. Markets also differ by region and industry, so look at job postings where you
hire, not only at global surveys.

Ask also who maintains the code in five years. An agency handing a site to a client's two-person team should
choose something that team can learn and hire for.

### 3. How interactive is it?

This is the question that most often changes the answer. Place your project on a spectrum:

```text
  documents ............ enhanced documents ............ applications
  docs, blogs,           shops, dashboards with          editors, design tools,
  marketing pages        filters, admin forms            chat, maps, games

  HTML from a server     server HTML + islands or        a client-rendered app,
  or a build; little     htmx/Alpine; JavaScript         usually with a meta-
  or no JavaScript       only where needed               framework for routes and data
```

Most of the web sits to the left of the middle. A page whose job is to be read needs HTML and CSS; a
framework adds value only to the parts that change. A tool where users spend hours manipulating state in the
browser sits on the right, and there a component framework with good state management pays for itself.
Getting this wrong in either direction is costly: a client-rendered single-page app for a blog ships tens of
kilobytes of JavaScript to show text, and a pile of jQuery-style scripts for a complex editor becomes the
state-synchronization mess [Chapter 3](03-the-problem-frameworks-solve.md) described.

### 4. Must it be found by search, and is it mostly content?

If pages must rank in search engines or show rich previews when shared, they need meaningful HTML in the
first response. Every meta-framework in [Chapter 18](18-meta-frameworks-and-rendering.md) can do that with
server rendering or static generation, and htmx and Alpine get it for free because the server renders the
page. Content-heavy sites also benefit from content tooling: Markdown with typed front matter, image
optimization, sitemaps. Astro and the documentation generators (Starlight, VitePress, Docusaurus) have it built
in.

### 5. What is your performance budget, and on which devices?

Decide how much JavaScript a page may load before you pick a framework, based on the devices your users
actually have. On a recent laptop, the difference between Tasklet's 10 kB in Solid and 70 kB in React is
invisible. On a mid-range phone on a slow connection, every 100 kB of JavaScript adds noticeable time to
download, parse and run.

On a small app the framework's fixed cost dominates, so compare Chapter 19's baselines with your budget:
5–12 kB for VanJS, Solid, Lit, Preact and Mithril; 18–28 kB for Svelte, htmx, Alpine and Vue; 70–77 kB for
React and Angular. On a large app your own code and libraries dominate, and splitting code by route matters
more than the runtime. Rendering strategy matters more than either: a
server-rendered page with islands ships a fraction of the JavaScript of the same page rendered on the client.

### 6. How long must it live?

A campaign site that lives six months can use whatever the team enjoys. An internal system that will run
for ten years should use something with a long, calm record and a backer likely to be around. Chapter 19's
[release table](19-comparing-frameworks.md#release-cadence-and-breaking-changes) is the evidence: React,
Angular, Vue and Lit have large backers or foundations and published policies; Mithril and Alpine have the
calmest APIs; Solid 2.0, Qwik 2.0 and htmx 4 are breaking majors in progress. A framework with a breaking
release in flight isn't a bad choice, but you should plan the upgrade into the project rather than discover
it later.

### 7. What backend do you already have?

If a Django, Rails, Laravel, Go or .NET application already renders HTML, already handles sessions and
already validates forms, the cheapest way to add interactivity is often to keep using it: htmx for partial
updates, Alpine for small client-side behavior, or Hotwire on Rails. Adding a separate JavaScript front end
means an API to design and version, authentication across two apps, validation in two places and a second
deployment. Sometimes that's worth it; it is never free.

If you have no backend yet and the front end is the product, a meta-framework gives you server routes and
data loading in the same codebase. If the backend is a separate API owned by another team, a client-rendered
app or a meta-framework that calls it are both reasonable.

### 8. Will it be embedded or distributed?

Code that runs inside someone else's page has different constraints. It must be small, because the host
didn't budget for it. It must not leak styles into the host page or be broken by the host's styles. It must
not conflict with whatever framework, and whatever version of it, the host already loads. Web Components with
shadow DOM ([Chapter 12](12-lit-and-web-components.md)) answer all three; small compiled frameworks (Svelte,
Solid, Preact) answer the first.

### 9. Will a design system serve many teams?

A component library used by one app should be written in that app's framework. A library used by teams on
React, Angular, Vue and server-rendered pages should be written once as Web Components, with Lit or Stencil,
and wrapped where needed. Chapter 12 lists the large design systems that took this path: Web Awesome,
Material Web, Spectrum, Carbon, Fluent and Ionic.

## A decision flow

The questions above, as a flow you can walk through in a few minutes. It doesn't replace thinking. It catches
the common mismatches early:

```text
START
  |
  +-- Embedded in other people's pages, or a design system for many stacks?
  |     yes --> Web Components: Lit (or Stencil for generated wrappers).
  |             Small widget, one host stack: Preact, Svelte or Solid.
  |
  +-- Mostly content (docs, blog, marketing)?
  |     yes --> Static generation: Astro (Starlight for docs), or VitePress /
  |             Docusaurus if the team already uses Vue / React.
  |             Interactive parts become islands in the team's framework.
  |
  +-- An existing server app that renders HTML (Django, Rails, Laravel, Go)?
  |     yes --> Keep it. Add htmx for partial updates, Alpine for local behavior
  |             (Hotwire on Rails). Move to a SPA only for screens that need it.
  |
  +-- Must work offline, or is it an editor/tool with heavy client state?
  |     yes --> A client-rendered app with a service worker; any major framework.
  |             Weigh signals-based ones (Solid, Svelte, Vue) for heavy updates.
  |
  +-- Does the team already know a major framework (React, Vue, Angular, Svelte)?
  |     yes --> Use it, with its meta-framework if you need SSR or routing:
  |             Next.js / React Router, Nuxt, Analog or Angular SSR, SvelteKit.
  |
  +-- Many teams, long life, strong conventions wanted?
  |     yes --> Angular, or React with an agreed stack (router, data, forms).
  |
  +-- Tight JavaScript budget on slow devices, public pages?
  |     yes --> Astro islands, SvelteKit, SolidStart, or Qwik if its constraints fit.
  |
  +-- None of the above
        --> The framework your team can hire for and support: React or Vue
            are the safe defaults; Svelte if the team prefers it.
```

The order matters. A design-system question comes before team preference, because a React team building
components for Angular teams still shouldn't write them in React. Content comes before the backend question,
because a docs site is static even if your company runs Django. And the team's knowledge comes before
performance, because a known framework with a sensible rendering strategy usually beats an unknown one with a
better runtime.

## Writing the decision down

When the flow leaves two or three candidates, write down your criteria and judgments so others can challenge
them. A weighted decision matrix lists the criteria, weights each by how much it matters to this project,
scores each candidate on each criterion, and adds up. Every number is a judgment; the value is that the
judgments become explicit, and that you can test how much the answer depends on each.

`examples/ch20/score.mjs` is a small matrix with one addition: a sensitivity check that changes each weight by
one step in each direction and reports whether the winner changes. It also reads Tasklet's measured sizes
from `compare-results.json`, so you can drop candidates whose baseline exceeds a budget:

`examples/ch20/score.mjs`
```js
// Usage: node score.mjs <scenario.json>
//
// A weighted decision matrix. The scenario file lists criteria with weights
// (how much each matters to you, 0–5) and, per candidate, a score per
// criterion (how well it does, 1–5). Those are your judgments, written down.
// Optionally, "maxBaselineKb" drops candidates whose Tasklet build (from
// tasklet/tools/compare-results.json) is larger, gzipped, than that budget.
//
// It prints the ranking, then a sensitivity check: for each criterion, does
// the winner change if that weight goes one step up or down? If it does, or
// if the top two are within 5 points, the decision is close and should be
// made on something the matrix doesn't hold.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const scenario = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const compare = JSON.parse(
  readFileSync(join(resolve(import.meta.dirname, '../../tasklet/tools'), 'compare-results.json'), 'utf8'),
)
const baselineKb = Object.fromEntries(compare.results.map((r) => [r.app, r.size.gzip / 1000]))

const candidates = Object.keys(scenario.scores).filter((name) => {
  const kb = baselineKb[name]
  if (scenario.maxBaselineKb === undefined || kb === undefined || kb <= scenario.maxBaselineKb) return true
  console.log(`dropped ${name}: Tasklet baseline ${kb.toFixed(2)} kB > ${scenario.maxBaselineKb} kB budget`)
  return false
})

function rank(weights) {
  const max = 5 * Object.values(weights).reduce((a, b) => a + b, 0)
  return candidates
    .map((name) => {
      const total = Object.entries(weights).reduce((sum, [criterion, w]) => sum + w * scenario.scores[name][criterion], 0)
      return { name, percent: Math.round((100 * total) / max) }
    })
    .sort((a, b) => b.percent - a.percent)
}

const ranking = rank(scenario.weights)
console.log(`\n${scenario.name}\n`)
for (const { name, percent } of ranking) console.log(`${name.padEnd(10)} ${String(percent).padStart(3)}%  ${'#'.repeat(percent / 5)}`)
if (ranking.length > 1 && ranking[0].percent - ranking[1].percent <= 5) {
  console.log(`\n${ranking[0].name} and ${ranking[1].name} are within 5 points: treat it as a tie.`)
}

console.log('\nSensitivity (winner if one weight changes by one step):')
for (const criterion of Object.keys(scenario.weights)) {
  const winners = [-1, 1].map((step) => {
    const w = Math.min(5, Math.max(0, scenario.weights[criterion] + step))
    return rank({ ...scenario.weights, [criterion]: w })[0].name
  })
  const flips = winners.some((name) => name !== ranking[0].name)
  console.log(`  ${criterion.padEnd(12)} ${winners.join(' / ')}${flips ? '   <- close call' : ''}`)
}
```

A scenario is a JSON file. Here is one for an embeddable booking widget, with a 25 kB budget for the
framework's baseline:

`examples/ch20/widget.json`
```json
{
  "name": "Embeddable widget: a booking form other sites paste in with one <script> tag",
  "maxBaselineKb": 25,
  "weights": { "size": 5, "isolation": 4, "longevity": 3, "team": 2, "ecosystem": 1 },
  "scores": {
    "react":  { "size": 1, "isolation": 2, "longevity": 5, "team": 5, "ecosystem": 5 },
    "preact": { "size": 4, "isolation": 2, "longevity": 4, "team": 4, "ecosystem": 3 },
    "svelte": { "size": 4, "isolation": 3, "longevity": 4, "team": 3, "ecosystem": 3 },
    "solid":  { "size": 5, "isolation": 2, "longevity": 3, "team": 3, "ecosystem": 2 },
    "lit":    { "size": 5, "isolation": 5, "longevity": 4, "team": 3, "ecosystem": 3 },
    "vanjs":  { "size": 5, "isolation": 2, "longevity": 2, "team": 2, "ecosystem": 1 }
  }
}
```

```console
$ node examples/ch20/score.mjs examples/ch20/widget.json
dropped react: Tasklet baseline 70.14 kB > 25 kB budget

Embeddable widget: a booking form other sites paste in with one <script> tag

lit         88%  #################
svelte      71%  ##############
preact      68%  #############
solid       67%  #############
vanjs       59%  ###########

Sensitivity (winner if one weight changes by one step):
  size         lit / lit
  isolation    lit / lit
  longevity    lit / lit
  team         lit / lit
  ecosystem    lit / lit
```

React is dropped before scoring: its Tasklet baseline alone is almost three times the budget. Lit wins clearly
on isolation, and no single change of weight flips the result. A different team might score Svelte's isolation
higher (it can compile to custom elements); arguing about that score is worth more than the total.

Three rules keep a matrix honest. Fix the weights before you score, so you don't tune them to the answer you
wanted. Score from evidence where there is some: Tasklet sizes, the benchmark, a prototype. And when two
candidates are within a few points, or a one-step change of weight flips the winner, stop adding precision.
Decide on the factor the matrix can't hold: which one the team wants to work in.

## Scenarios

Each scenario below gives a recommendation, a runner-up and the reasons against the alternatives a team
would most likely consider. The recommendations assume a typical team for the scenario; if your team knows
the runner-up well, that often outweighs the difference.

### Documentation site or blog

Pages are content written in Markdown, updated by developers or writers, read by people arriving from search.
Interactivity is limited to search, a theme toggle, maybe a code playground.

- **Recommendation: Astro**, with **Starlight** (0.42) for documentation. Static generation by default,
  content collections with typed front matter, zero JavaScript for pages that don't need it, and islands in
  any framework for the parts that do ([Chapter 18](18-meta-frameworks-and-rendering.md)).
- **Runner-up: VitePress** (1.6) if the team works in Vue, or **Docusaurus** (3.10) if it works in React and
  wants versioned docs and translations built in. Both generate static pages and hydrate them as an app, so
  they ship more JavaScript than Astro, which matters little for docs.
- **Why not** a client-rendered single-page app: search engines and link previews see an empty page until
  JavaScript runs, and every reader downloads a framework to read text. **Why not** Next.js or Nuxt: both can
  generate static sites, but they bring an application framework's complexity to a content problem.

### Marketing site

A handful of designed pages, frequent copy changes by non-developers, forms, analytics, A/B tests, and a
strict performance budget because the pages compete for search and ad traffic.

- **Recommendation: Astro** with a headless CMS. Pages are static and fast by default, editors work in the
  CMS, and the pricing calculator or demo request form becomes an island.
- **Runner-up: Next.js or Nuxt**, if the marketing site shares components and a design system with the
  product, or needs per-request personalization. Use static rendering and caching wherever you can.
- **Why not** a website builder? For many marketing sites, it's the right answer, and no framework is needed
  at all. Choose code when you need the design system, the performance budget or integration with the
  product. **Why not** Qwik: resumability helps exactly this kind of page, but its smaller ecosystem and
  pending 2.0 migration make it a harder sell than Astro, which gets most of the same benefit from islands.

### SaaS dashboard

A logged-in application: tables, filters, forms, charts, settings, dozens of screens, a team of several
developers and a life of many years. Search engines don't see it.

- **Recommendation: React**, with Vite and a client router, or with React Router or TanStack Start if you want
  route-level data loading. The ecosystem for this kind of app (data grids, form libraries, chart libraries,
  component kits, query caches) is the largest, and so is the hiring pool.
- **Runner-up: Vue** with Pinia and Vue Router, or **Angular** if the team prefers one integrated platform.
  Both are complete, well documented and have large ecosystems of components for this kind of app.
- **Why not** Next.js with Server Components everywhere: a dashboard behind a login gains little from server
  rendering, and the server adds hosting and complexity. Use it if you need it for other reasons.
  **Why not** htmx: viable for a simple admin, but dozens of interdependent filters, charts and editable tables
  become a lot of partial-update bookkeeping on the server.

Exercise 1 runs this scenario through `score.mjs` and looks at how robust the result is.

### E-commerce storefront

Product and category pages must be indexed and load fast on phones; the cart, search and checkout are
interactive. Slow pages lose customers, so this is where performance budgets get enforced.

- **Recommendation: a server-rendering meta-framework the team knows**: Next.js, Nuxt or SvelteKit. Product
  pages are statically generated or cached and revalidated when prices change, as in
  [Chapter 18](18-meta-frameworks-and-rendering.md#exercises); cart and checkout are client-side.
- **Runner-up: Astro** with islands for the cart and product options, when most pages are browse-only and the
  interactive parts are few. **Qwik** is designed for exactly this case, but see below.
- **Why not** a client-rendered app: product pages need content in the first response. **Why not** Qwik as
  the default: resumability keeps the JavaScript loaded up front small (28.74 kB of Tasklet's 45.70 kB in
  [Chapter 11](11-qwik.md)), but its hiring pool and ecosystem are the smallest here, and the 2.0 package
  move is ahead of you. Consider it when speed on slow phones decides revenue.

Running a storefront scenario for a team with no strong preference shows how close the main options are:

```console
$ node examples/ch20/score.mjs examples/ch20/storefront.json

Storefront: product pages found through search, most visitors on phones, a team of four

react       81%  ################
vue         79%  ###############
svelte      76%  ###############
qwik        68%  #############
solid       64%  ############

react and vue are within 5 points: treat it as a tie.

Sensitivity (winner if one weight changes by one step):
  ssr          react / react
  mobile       react / react
  ecosystem    react / react
  hiring       react / react
  team         react / react
```

React and Vue are within two points, and Svelte is close behind. That is the honest result: any of them,
server-rendered, makes a good storefront. Exercise 2 shows how a team's experience settles it.

### Embeddable widget

A booking form, a chat bubble or a reviews panel that other sites add with one `<script>` tag. You don't
control the host page's framework, CSS or JavaScript budget.

- **Recommendation: Lit**, as a custom element with shadow DOM. Hosts use it like an HTML tag, styles are
  isolated in both directions, and Tasklet's Lit build is 10.64 kB.
- **Runner-up: Preact or Svelte**, compiled into one script that mounts into a host element, when you need
  their ecosystem or the team knows them. Svelte can also compile components to custom elements.
- **Why not** React: the matrix above dropped it on size alone, and two copies of React on a host that already
  uses another version cause subtle problems. **Why not** an iframe: it isolates perfectly but can't adapt to
  the host's layout or theme easily, and it's heavy. It's still right for payment forms, where isolation is
  a security requirement.

### Internal CRUD tool on an existing backend

An admin interface over a Django, Rails, Laravel or Go application: lists, filters, edit forms, a few
dashboards, used by employees. The backend already has the models, validation, authentication and templates.

- **Recommendation: htmx with Alpine.js**, inside the existing app. The server keeps rendering HTML, htmx swaps
  fragments for search-as-you-type, inline edits and pagination, and Alpine handles local behavior such as
  dropdowns and modals. There is no separate API, no client state and no second deployment
  ([Chapter 13](13-htmx.md), [Chapter 14](14-alpine.md)). On Rails, **Hotwire** (Turbo and Stimulus) is the
  house style and an equally good choice; on Laravel, **Livewire** with Alpine.
- **Runner-up: Django's or Rails's built-in admin**, if the tool is close to raw data editing; or a small Vue
  or React app for one or two screens that need rich client state, mounted inside a server-rendered page.
- **Why not** a separate single-page app with an API: it doubles the surface (API, auth, validation,
  deployment) for a tool whose users sit on the company network and don't need offline or instant updates.

### Design system for many teams

Buttons, inputs, dialogs and layout components for a company whose teams use React, Angular, Vue and
server-rendered pages, maintained by a central team for years.

- **Recommendation: Lit**, publishing custom elements, design tokens as CSS custom properties, and thin
  wrappers where a framework needs them (React 19 supports custom elements well; Angular and Vue always
  have). Adobe Spectrum, IBM Carbon and Web Awesome took this path.
- **Runner-up: Stencil**, which generates the React, Angular and Vue wrapper packages for you, at the cost of
  a heavier build ([Chapter 12](12-lit-and-web-components.md)).
- **Why not** one framework's components: every team on another stack would need a separate port, and ports
  drift. **Why not** shadow DOM everywhere without thought: forms, ARIA references across shadow boundaries
  and global CSS need design decisions up front. Decide which components use shadow DOM and how they
  participate in forms (`ElementInternals`) before you build fifty of them.

### Enterprise application with many teams

A large application (an insurance platform, an ERP front end, a banking portal) with ten or more teams, a
life measured in decades, strict requirements for accessibility, security review and long-term support.

- **Recommendation: Angular.** Every team gets the same router, forms, HTTP client, dependency injection,
  testing setup and CLI, with a published schedule, long-term support and `ng update` migrations
  ([Chapter 7](07-angular.md)). Conventions the framework decides don't have to be agreed by twenty teams.
- **Runner-up: React** with a stack the organization decides once and documents: a framework (Next.js or
  React Router), a data library, a form library, a component library, lint rules. React's flexibility is a
  strength for one team and a cost for twenty, so an internal platform team usually provides the defaults.
- **Why not** micro-frontends in several frameworks by default: see the
  [section on migration](#micro-frontends-with-caution). **Why not** a young framework: a ten-year horizon
  needs a backer and a record, and Chapter 19's governance table shows which have them.

### Content with islands of interactivity

A news site, a university site or a product catalog: mostly content, with a few rich components such as a
search box, an interactive chart, a comment thread or a configurator.

- **Recommendation: Astro**, with the interactive parts as islands in whichever framework suits each one,
  hydrated only when needed (`client:visible`, `client:idle`). Chapter 18's example shipped 7.4 kB for a Solid
  island and 66.8 kB for a React one, and nothing for the static parts.
- **Runner-up:** a server-rendered app in your backend's templates, with **Alpine** or **htmx** for the
  interactive parts, if the content already lives in a CMS or server app that renders pages.
- **Why not** a meta-framework that hydrates every page: the content parts would pay for hydration they don't
  need. Next.js with Server Components reaches a similar result inside React, which makes it a good choice
  if the team is already on React; Astro gets there with less to learn.

### Offline-first progressive web app

A field-service app, a note-taking tool or a point-of-sale screen that must keep working without a network
and sync later.

- **Recommendation: a client-rendered app in the team's framework**, with a service worker that caches the
  app shell and IndexedDB for data (Dexie 4.4 is a common wrapper). `vite-plugin-pwa` (2.0, built on
  Workbox 7) adds the service worker to any Vite app; Angular has `@angular/pwa`; SvelteKit registers
  `src/service-worker.ts` itself. The hard part, conflict resolution when two devices edit the same record
  offline, is the same in every framework, so choose a sync approach before a framework.
- **Runner-up: Svelte or Solid**, when the app runs on low-end devices and the UI updates often; their
  fine-grained updates and small baselines help on modest hardware.
- **Why not** htmx or another server-rendered approach: without a server there is no HTML to swap. Tasklet's
  htmx app skips the six tests about client-side loading and storage for exactly this reason. **Why not**
  server components or server-only data loading: the server is precisely what you can't count on.

### Mobile apps through web technology

If you need an app in the stores, three paths reuse what this course covered:

- **Capacitor** (8.6, from Ionic) wraps your web app, built with any framework, in a native shell with
  plugins for device APIs. The UI is still HTML in a web view.
- **React Native** (0.88), usually through **Expo**, renders native platform views from React components. You
  reuse React knowledge and logic, not your web components or CSS.
- **NativeScript** (9.1) renders native views from TypeScript, with Angular, Vue, Svelte, Solid or React.

A responsive PWA may be enough if you don't need the stores. This course doesn't go further; each project's
documentation is the place to start.

### The scenarios at a glance

| Scenario | Recommendation | Runner-up |
| --- | --- | --- |
| Docs site or blog | Astro (Starlight) | VitePress, Docusaurus |
| Marketing site | Astro + headless CMS | Next.js or Nuxt |
| SaaS dashboard | React (Vite, React Router or TanStack) | Vue, Angular |
| E-commerce | Next.js, Nuxt or SvelteKit (the one the team knows) | Astro islands; Qwik |
| Embeddable widget | Lit | Preact, Svelte |
| Internal CRUD on Django/Rails/Go | htmx + Alpine (Hotwire on Rails) | Built-in admin; one small SPA screen |
| Design system for many teams | Lit | Stencil |
| Enterprise, many teams | Angular | React with a decided stack |
| Content + islands | Astro | Server templates + Alpine/htmx |
| Offline-first PWA | The team's framework + service worker | Svelte, Solid |
| Mobile apps | Capacitor (reuse the web app) | React Native, NativeScript |

## The case for boring choices

In 2015, Dan McKinley, drawing on his years as an engineer at Etsy, wrote an essay that every team choosing
a framework should read. Its argument is about attention, not about technology:

> Let’s say every company gets about three innovation tokens. You can spend these however you want, but the
> supply is fixed for a long while.
>
> — Dan McKinley, "Choose Boring Technology" (2015)

A mature framework's problems are known, searchable and answered; a new framework's are discovered by you, in
production, and each new tool adds to what the team must know and operate. So spend innovation on what makes
your product different, and choose well-understood tools for the rest. McKinley is careful to add that
boring "should not be conflated with" bad: boring tools are the ones whose failure modes are known.

Applied to front ends, the argument favors the frameworks with long records and large communities (React,
Vue, Angular, and Svelte now that version 5 has settled) and the oldest stack of all: HTML from a server.
It cuts against adopting a framework because it tops a benchmark or a survey's interest chart.

It doesn't mean never adopting anything new. Some projects need what a newer framework does: Qwik's
resumability for a storefront whose revenue depends on first-load time on slow phones, Solid's fine-grained
updates for a dense, constantly updating trading screen. Spend a token there deliberately, with a prototype
and a fallback plan, knowing it's one you can't spend on a new database in the same project.

## Migrating incrementally

Most framework decisions are made for existing code: a jQuery app, an AngularJS app past its end of life, a
Vue 2 app, a server-rendered app that needs more interactivity. The safest migration path is almost never a
rewrite. Rewrites take longer than planned, the old app keeps changing in the meantime, and the new one
ships with fewer features than the old one had. Change the app one piece at a time instead, keeping it
working and shipping throughout.

### Route by route

The *strangler fig* pattern, named by Martin Fowler, grows the new system around the old one until the old
one can be removed. For a web app, put a proxy or the server's router in front of both apps and move one
route at a time: `/reports` is served by the new app, everything else by the old. Users notice a full page
load between sections and little else. Start with a route that is valuable and self-contained, not the
hardest one, so the team learns the new framework on a manageable problem.

### Islands inside the old app

When the old app renders HTML, mount new components into it: a React, Vue or Svelte component that takes
over one `<div>` on a server-rendered page. Each framework can mount into any element (`createRoot`,
`createApp().mount()`, `mount()` in Svelte 5), so the old page doesn't need to know. This is the islands
architecture from Chapter 18, applied by hand. It works well for adding interactivity to a server app, and
as the first step of a larger migration.

### Web Components as bridges

Custom elements are the one component format every framework can render. Wrap a new component as a custom
element (with Lit, or with Vue's `defineCustomElement` or Svelte's `customElement` option) and the old app,
whether jQuery, AngularJS or server templates, can use it as a tag. In the other direction, an old widget
wrapped as a custom element can live inside the new app until it's replaced. The cost is a second runtime
on the page during the transition, and the property, event and styling differences
[Chapter 12](12-lit-and-web-components.md) described.

### Micro-frontends, with caution

Micro-frontends split one application into parts owned and deployed by separate teams, composed at runtime
through Module Federation, Web Components or server-side includes. Cam Jackson's article on Martin Fowler's
site makes the case: independent deployment and autonomous teams. The same article lists the costs: larger
downloads when parts duplicate dependencies, differences between environments, and operational and
governance complexity.

They solve an organizational problem, many teams that must release independently, and add technical ones:
several runtimes to download, several versions of shared libraries, colliding styles and state shared across
boundaries ([Chapter 16](16-state-routing-and-data.md#one-store-two-frameworks) showed one way). Use them only
for that organizational need, keep to one framework if you can, and give a migration's temporary mix a date
for removing the old side.

## Evaluating a new framework

New frameworks will appear after this course. You can evaluate any of them in a few days with the method this
course used: build Tasklet.

[Appendix C](appendix-c-tasklet-spec.md) specifies Tasklet completely: the behavior, the DOM contract the
tests rely on, the fifteen acceptance tests and how to add a new implementation. Building it exercises the
things you do every day: components, a list with keys, derived values, forms, events, filtering, persistence
and accessible markup. In practice:

1. **Build it the framework's way.** Scaffold with its official starter, read the tutorial, then build
   Tasklet without fighting the framework. Note where you had to look things up and what surprised you.
2. **Add a `tasklet.json`** with a name, a free port, the build and serve commands and the persistence
   mode, and run the acceptance suite for your app alone with `node run-all.mjs <folder>` in `tasklet/e2e`.
   Failures show where your app's behavior differs from the contract.
3. **Measure it** with `node tasklet/tools/compare.mjs`, which finds every folder with a `tasklet.json`. If
   the build doesn't write to `dist/`, add the folder to `OUTPUT` at the top of the script. You get size,
   source lines and build time next to the thirteen apps already there.
4. **Go beyond Tasklet** in a day: add a route, a form with validation, server rendering, a test. Read the
   framework's issue tracker and changelog for the last year.
5. **Check the record**: who maintains it, who funds it, how it handled its last breaking change, how many
   people use it (with Chapter 19's caveats about every adoption signal).

Write the results down in the shape of a framework chapter's "Strengths and trade-offs". You'll know more
than any benchmark or survey can tell you, and have a working app to show the team.

## Where to go next

If you want depth in one framework, start with its official tutorial or guide, kept up to date by the
framework's team. Several (React, Vue, Svelte, Angular, Solid, Preact, Lit) run interactively in the
browser:

| Framework | Start here |
| --- | --- |
| React | [react.dev/learn](https://react.dev/learn) |
| Vue | [vuejs.org/tutorial](https://vuejs.org/tutorial/) |
| Svelte | [svelte.dev/tutorial](https://svelte.dev/tutorial) |
| Angular | [angular.dev/tutorials](https://angular.dev/tutorials) |
| Solid | [solidjs.com/tutorial](https://www.solidjs.com/tutorial) |
| Preact | [preactjs.com/tutorial](https://preactjs.com/tutorial/) |
| Mithril | [mithril.js.org simple application](https://mithril.js.org/simple-application.html) |
| VanJS | [vanjs.org/tutorial](https://vanjs.org/tutorial) |
| Qwik | [qwik.dev/docs](https://qwik.dev/docs/) |
| Lit | [lit.dev/tutorials](https://lit.dev/tutorials/) |
| htmx | [htmx.org/docs](https://htmx.org/docs/) |
| Alpine.js | [alpinejs.dev/start-here](https://alpinejs.dev/start-here) |
| Astro | [the Astro tutorial](https://docs.astro.build/en/tutorial/0-introduction/) |

Sibling courses go deeper in directions this course only touched:

- [The React course](../learn-react/README.md) builds a complete game in React, from state and events to
  effects, performance and testing. Read it if Chapter 4 left you wanting more React.
- [The TypeScript Crash Course](../learn-typescript-crashcourse/README.md) covers the type system every
  framework here relies on, if the TypeScript in the Tasklet apps was hard to follow.
- [The project development course](../learn-project-development/README.md) covers what surrounds the code:
  planning, version control, testing, review and shipping. Those practices decide a project's fate more than
  its framework.

And keep [Appendix A](appendix-a-rosetta-stone.md) nearby when you move between frameworks: it shows how
the same concept is written in each one.

## The end of the course

You started with a page and the DOM, and a problem: keeping what the user sees in step with the state
behind it. Every framework in this course is an answer to that problem, and each answer has a cost. React,
Preact and Mithril re-render and compare; Vue, Solid, Svelte, Angular and VanJS track dependencies with
signals; Svelte and Solid move work into a compiler; Qwik resumes instead of replaying; Lit uses the
browser's own component model; htmx and Alpine keep the HTML the server sends and add behavior to it. You
have seen each answer applied to the same small app, measured, tested and compared.

Frameworks will change after this course, as they did during it. The questions in this chapter won't. Who
builds and maintains it, how interactive it is, where the HTML comes from, how much JavaScript the users'
devices can afford, how long it must last: answer those, prototype the close calls, and choose something
your team understands.

## Summary

- For most projects several frameworks would work. Avoid a bad fit, then choose the good fit your team will
  be most productive with.
- Nine questions separate the options: team skills, hiring, interactivity, search and content, performance
  budget, longevity, existing backend, embedding, and design systems.
- Interactivity decides the architecture before the framework: documents want HTML, enhanced documents want
  islands or htmx and Alpine, applications want a component framework.
- A weighted matrix (`examples/ch20/score.mjs`) makes judgments explicit. When the top two are close or a
  one-step change of weight flips the winner, decide on what the matrix can't hold.
- Typical picks: Astro for content, docs and marketing; React (or Vue, Angular) for dashboards; a
  server-rendering meta-framework for storefronts; Lit for widgets and cross-framework design systems;
  htmx and Alpine on an existing server; Angular for large multi-team apps; the team's framework plus a
  service worker for offline apps.
- Spend innovation tokens deliberately; elsewhere, prefer well-understood tools.
- Migrate incrementally: route by route, islands, Web Components as bridges. Use micro-frontends only for an
  organizational need.
- Evaluate a new framework by building Tasklet from [Appendix C](appendix-c-tasklet-spec.md) and running
  the acceptance suite and `compare.mjs`.

## Exercises

1. **Test a dashboard decision.** Run `score.mjs` on `examples/ch20/dashboard.json`, the SaaS dashboard
   scenario for a team of eight React developers. How robust is the result, and which single criterion gives
   it most of its margin?

   <details><summary>Solution</summary>

   `examples/ch20/dashboard.json`
   ```json
   {
     "name": "SaaS dashboard: eight developers who know React, many forms and tables, behind a login",
     "weights": { "team": 5, "ecosystem": 4, "hiring": 4, "longevity": 3, "typescript": 3, "size": 1 },
     "scores": {
       "react":   { "team": 5, "ecosystem": 5, "hiring": 5, "longevity": 5, "typescript": 5, "size": 2 },
       "vue":     { "team": 2, "ecosystem": 4, "hiring": 4, "longevity": 4, "typescript": 4, "size": 4 },
       "angular": { "team": 1, "ecosystem": 4, "hiring": 4, "longevity": 5, "typescript": 5, "size": 2 },
       "svelte":  { "team": 2, "ecosystem": 3, "hiring": 3, "longevity": 4, "typescript": 4, "size": 4 },
       "solid":   { "team": 3, "ecosystem": 2, "hiring": 2, "longevity": 3, "typescript": 5, "size": 5 }
     }
   }
   ```

   ```console
   $ node examples/ch20/score.mjs examples/ch20/dashboard.json

   SaaS dashboard: eight developers who know React, many forms and tables, behind a login

   react       97%  ###################
   vue         70%  ##############
   angular     69%  #############
   svelte      62%  ############
   solid       60%  ############

   Sensitivity (winner if one weight changes by one step):
     team         react / react
     ecosystem    react / react
     hiring       react / react
     longevity    react / react
     typescript   react / react
     size         react / react
   ```

   React wins by 27 points, and no one-step change of any weight changes the winner, so the result is
   robust. The weights add up to 20, so the maximum is 100 points and the percentages are points. The largest
   share of the margin comes from `team`, the heaviest weight, where React scores 5 and Vue 2: 3 × 5 = 15 of
   the 27 points between them. The lead is also broad: React scores at least as well as Vue on every
   criterion except size, so even with `team` at weight 0, React would lead by 72 to 60 out of 75. The
   matrix confirms what the decision flow said: a team that knows React should build the dashboard in
   React.

   </details>

2. **A Vue team's storefront.** The storefront scenario in this chapter came out as a tie between React and
   Vue. Suppose the team of four has built two Nuxt apps together. Change one score in a copy of
   `storefront.json` to reflect that, run it, and interpret the sensitivity check.

   <details><summary>Solution</summary>

   The only change is Vue's `team` score, from 3 to 5:

   `examples/ch20/solutions/storefront-vue-team.json`
   ```json
   {
     "name": "Storefront: product pages found through search, most visitors on phones, a team of four who know Vue",
     "weights": { "ssr": 5, "mobile": 4, "ecosystem": 3, "hiring": 3, "team": 2 },
     "scores": {
       "react":  { "ssr": 5, "mobile": 2, "ecosystem": 5, "hiring": 5, "team": 3 },
       "vue":    { "ssr": 5, "mobile": 3, "ecosystem": 4, "hiring": 4, "team": 5 },
       "svelte": { "ssr": 5, "mobile": 4, "ecosystem": 3, "hiring": 3, "team": 3 },
       "qwik":   { "ssr": 5, "mobile": 5, "ecosystem": 2, "hiring": 1, "team": 2 },
       "solid":  { "ssr": 4, "mobile": 4, "ecosystem": 2, "hiring": 2, "team": 3 }
     }
   }
   ```

   ```console
   $ node examples/ch20/score.mjs examples/ch20/solutions/storefront-vue-team.json

   Storefront: product pages found through search, most visitors on phones, a team of four who know Vue

   vue         84%  ################
   react       81%  ################
   svelte      76%  ###############
   qwik        68%  #############
   solid       64%  ############

   vue and react are within 5 points: treat it as a tie.

   Sensitivity (winner if one weight changes by one step):
     ssr          vue / vue
     mobile       vue / vue
     ecosystem    vue / vue
     hiring       vue / vue
     team         react / vue   <- close call
   ```

   Vue now leads, but by 3 points, and the sensitivity check flags `team`: with its weight one step lower,
   React wins again. The matrix can't decide this, and it says so. The decision goes to the factor it holds
   only coarsely: a team that has shipped two Nuxt apps will be productive in Nuxt from the first day, which
   is worth more than React's larger hiring pool for a team of four. Choose Nuxt, and record why.

   </details>

3. **A council website.** A city council needs a new site: about 2,000 pages of information maintained by
   twenty editors, a search box, a form for reporting problems with a map to pick a location, and strict
   accessibility requirements. The council's IT team of three runs a Django application for internal case
   management. Give a recommendation, a runner-up and the main reason against a single-page app.

   <details><summary>Solution</summary>

   **Recommendation:** Django with Wagtail (a Django CMS), which keeps a team of three on the stack it
   already runs. The report form is a normal HTML form that works without JavaScript; the map picker is the
   one island, a mapping library with a few lines of Alpine. **Runner-up:** Astro with a headless CMS, if
   the council wants the public site separate from internal systems. **Why not a single-page app:** 2,000
   pages must be indexed and readable on any device without waiting for JavaScript, accessibility is easier
   with plain HTML links and forms, and the team would gain a second stack to maintain for no benefit to
   readers.

   </details>

4. **Plan a migration.** A five-year-old AngularJS app with 60 screens supports a company's sales team. It
   works, but AngularJS has had no support since January 2022 and new developers don't want to work on it.
   Outline a migration that never stops the team from shipping features.

   <details><summary>Solution</summary>

   1. **Choose the target with the questions in this chapter.** A long-lived internal app with many forms,
      built by an enterprise team: modern Angular is a natural choice, and `@angular/upgrade` lets
      AngularJS and Angular components run in one page during the move. React or Vue are reasonable if the
      team prefers them.
   2. **Put the old and new apps behind one router or proxy** and share the login session, so users move
      between them without noticing more than a page load.
   3. **Move route by route** (the strangler fig), starting with a valuable, self-contained screen. New
      features are built only in the new app from now on.
   4. **Bridge shared widgets** that both apps need, such as a customer picker, as custom elements during the
      transition, so they're written once.
   5. **Track progress** by the number of routes left in AngularJS, and set a date to delete it. Expect the
      last 20% of screens to take disproportionately long; budget for it.

   Avoid a rewrite that freezes features for a year, and avoid running both apps indefinitely.

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-20--choosing-a-framework)
