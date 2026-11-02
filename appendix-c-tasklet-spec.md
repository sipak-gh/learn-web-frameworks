# Appendix C — Tasklet Specification

Tasklet is the small task list that this course builds thirteen times. This appendix is its reference: what
the app does, the DOM it must produce, the seed data, the 15 acceptance tests and what each one checks, the
`tasklet.json` manifest, the server mode used by htmx, the commands that build, test and measure the apps,
and a step-by-step guide for adding an implementation of your own.

How to read it:

- Everything here was checked against the code in `tasklet/`: the tests in
  `tasklet/e2e/tests/tasklet.spec.ts`, the harness in `tasklet/e2e/`, the tools in `tasklet/tools/`, the
  shared files in `tasklet/shared/` and the thirteen apps. Where this appendix and the code disagree, the
  code wins.
- Paths are relative to the course root unless a command says `cd` first. Commands assume Node.js 26 and
  npm 11, the versions the course uses.
- [Chapter 3](03-the-problem-frameworks-solve.md#the-acceptance-test) introduces the acceptance test, and
  [Chapter 19](19-comparing-frameworks.md#measuring-tasklet) uses the measuring tools to compare the apps.

## The implementations

Every app is a standalone project in `tasklet/<folder>/`, with its own `package.json`, lockfile and
`tasklet.json`. The ports are fixed, so the apps can run side by side.

| Folder | Port | Chapter | Language | Persistence | Skipped tests | Build output |
|---|---|---|---|---|---|---|
| `vanilla` | 4301 | [3 — The Problem Frameworks Solve](03-the-problem-frameworks-solve.md) | TypeScript | localStorage | 0 | `dist/` |
| `react` | 4302 | [4 — React](04-react.md) | TypeScript (TSX) | localStorage | 0 | `dist/` |
| `vue` | 4303 | [5 — Vue](05-vue.md) | TypeScript (`.vue` SFCs) | localStorage | 0 | `dist/` |
| `svelte` | 4304 | [6 — Svelte](06-svelte.md) | TypeScript (`.svelte` components) | localStorage | 0 | `dist/` |
| `angular` | 4305 | [7 — Angular](07-angular.md) | TypeScript | localStorage | 0 | `dist/angular/browser/` |
| `solid` | 4306 | [8 — Solid](08-solid.md) | TypeScript (TSX) | localStorage | 0 | `dist/` |
| `preact` | 4307 | [9 — Preact](09-preact.md) | TypeScript (TSX) | localStorage | 0 | `dist/` |
| `mithril` | 4308 | [10 — Mithril and the Minimalists](10-mithril-and-the-minimalists.md) | JavaScript | localStorage | 0 | `dist/` |
| `vanjs` | 4309 | [10 — Mithril and the Minimalists](10-mithril-and-the-minimalists.md) | JavaScript | localStorage | 0 | `dist/` |
| `qwik` | 4310 | [11 — Qwik](11-qwik.md) | TypeScript (TSX) | localStorage | 0 | `dist/` (static site generation) |
| `lit` | 4311 | [12 — Lit and Web Components](12-lit-and-web-components.md) | TypeScript | localStorage | 0 | `dist/` |
| `htmx` | 4312 | [13 — htmx](13-htmx.md) | TypeScript (a Node.js server) | server | 6 | none: the server renders every page |
| `alpine` | 4313 | [14 — Alpine.js](14-alpine.md) | JavaScript | localStorage | 0 | `dist/` |

Every manifest uses `npm run build` to build. Every app serves its production build with `npm run preview`,
except htmx, which starts its server with `npm run serve` (`node src/server.ts`). The six htmx skips are
listed under [Server mode](#server-mode).

## Behavior

Tasklet shows a list of tasks. You can add, complete, delete and filter them, and the list survives a
reload. The behavior, in the order an app meets it:

- **Start.** If `localStorage["tasklet:v1"]` holds a valid JSON array of tasks, the app shows it at once: no
  fetch and no loading state. An empty array `[]` counts as a valid saved list. Otherwise (no entry, invalid
  JSON, or JSON that isn't a task array) the app fetches `./tasks.json`, a relative URL served from the
  app's static folder, and shows the loading state until the request settles.
- **Loading.** `<p role="status">Loading tasks…</p>`, with the single ellipsis character U+2026. The list,
  the empty message and the footer aren't shown.
- **Error.** A response that isn't OK (such as HTTP 500) or a network failure shows
  `<p role="alert">Couldn't load tasks.</p>`, with a straight apostrophe U+0027, and a
  `<button type="button">Retry</button>`. Retry fetches again and shows the loading state while it waits.
- **Add.** A form named "Add task" holds a text field labeled "New task" and a submit button "Add". The
  title is trimmed; if nothing is left, nothing happens. Otherwise the task is appended to the end of the
  list with `done: false` and `id: crypto.randomUUID()`, and the field is cleared. Pressing Enter submits
  too.
- **Toggle.** Each task's checkbox toggles `done`. The checkbox sits inside a `<label>` with the title, so
  clicking the title toggles it too.
- **Delete.** Each task has a button with the accessible name `Delete "<title>"` (straight double quotes)
  and the visible text `×` (U+00D7). It removes the task.
- **Filter.** A group named "Filter" holds three buttons, "All", "Active" and "Done". The current one has
  `aria-pressed="true"` and the other two `aria-pressed="false"`. The default is All, and the filter isn't
  saved: after a reload it is All again. Completing a task while Active is selected removes it from view.
- **Empty.** When the tasks are loaded and no task matches the filter, `<p class="empty">Nothing to show.</p>`
  replaces the list.
- **Count.** `<p class="count" aria-live="polite">` counts the tasks that aren't done, across all tasks and
  regardless of the filter: "0 tasks left", "1 task left", "2 tasks left".
- **Clear done.** `<button type="button">Clear done</button>` removes every done task. It has the real
  `disabled` attribute (not `aria-disabled`) when no task is done. The count and Clear done are shown only
  when the tasks are loaded.
- **Persistence.** After every change to the list (add, toggle, delete, Clear done, and the first successful
  fetch) the app writes the whole array as JSON to `localStorage["tasklet:v1"]`. Saving in an effect, a
  moment after the change, is fine; the tests poll.
- **Task shape.** `{ id: string, title: string, done: boolean }`. The apps check data from storage and from
  `tasks.json` against this shape before using it.

The htmx implementation keeps the list on its server instead of in `localStorage` and renders it into the
page, so the start, loading, error and persistence rules apply to it in their server form. See
[Server mode](#server-mode).

## The DOM contract

The tests find elements by role and accessible name, plus three CSS classes, so the structure below is a
contract. It shows the loaded state with the seed data:

```html
<main class="tasklet">
  <h1>Tasklet</h1>
  <form aria-label="Add task" class="add">
    <label for="new-task">New task</label>
    <input id="new-task" name="title" autocomplete="off">
    <button type="submit">Add</button>
  </form>
  <div role="group" aria-label="Filter" class="filters">
    <button type="button" aria-pressed="true">All</button>
    <button type="button" aria-pressed="false">Active</button>
    <button type="button" aria-pressed="false">Done</button>
  </div>
  <!-- one of: loading status / error alert + Retry / ul / empty paragraph -->
  <ul class="tasks" aria-label="Tasks">
    <li class="task">
      <label><input type="checkbox"> <span>Read the Vue chapter</span></label>
      <button type="button" class="delete" aria-label='Delete "Read the Vue chapter"'>×</button>
    </li>
    <li class="task">
      <label><input type="checkbox"> <span>Try Svelte runes</span></label>
      <button type="button" class="delete" aria-label='Delete "Try Svelte runes"'>×</button>
    </li>
    <li class="task done">  <!-- class "done" only when done -->
      <label><input type="checkbox" checked> <span>Write a signal from scratch</span></label>
      <button type="button" class="delete" aria-label='Delete "Write a signal from scratch"'>×</button>
    </li>
  </ul>
  <footer class="footer">
    <p class="count" aria-live="polite">2 tasks left</p>
    <button type="button" class="clear">Clear done</button>
  </footer>
</main>
```

The other states replace the list with one of these, and hide the footer except in the empty state:

```html
<p role="status">Loading tasks…</p>

<p role="alert">Couldn't load tasks.</p>
<button type="button">Retry</button>

<p class="empty">Nothing to show.</p>
```

How the tests find each part:

| Part | Located by | Must have |
|---|---|---|
| Page | role `main`; role `heading` level 1 | heading text exactly "Tasklet" |
| Add form | role `form` named "Add task" | a textbox named "New task"; a button "Add" with `type="submit"` |
| Filter | role `group` named "Filter", then its buttons | buttons with the texts All, Active, Done in that order; `aria-pressed` as the strings `"true"`/`"false"` on all three |
| List | role `list` named exactly "Tasks" (`aria-label="Tasks"`) | one `listitem` per visible task, in list order |
| Task | `listitem` inside the list | class `task`, plus `done` only when done; a checkbox whose accessible name is the title; a `<span>` whose `textContent` is exactly the title; a button named `Delete "<title>"` with the text `×` |
| Loading | role `status` with the text "Loading tasks…" | the only `status` on the page |
| Error | role `alert` with the text "Couldn't load tasks."; button "Retry" | the only `alert`; Retry has `type="button"` |
| Empty | the exact text "Nothing to show." | class `empty` |
| Count | CSS `p.count` | `aria-live="polite"` and no role |
| Clear done | role `button` named "Clear done" | `type="button"`; the `disabled` attribute when no task is done |

The strict parts, which caught real bugs while the apps were written:

- **One live region of each kind.** Don't add another `role="status"` or `role="alert"`; the loading and
  error tests read "the" status and "the" alert. `p.count` is a live region through `aria-live` alone.
- **The label holds only the checkbox and the title.** The checkbox's accessible name comes from the
  wrapping `<label>`, so anything else inside it changes the name. Keep `<span>{title}</span>` on one line in
  templates that preserve whitespace: the add test compares the span's `textContent` with the trimmed title.
- **`aria-pressed` is always rendered.** Some frameworks drop an attribute bound to the boolean `false`.
  Bind `String(pressed)` if yours does.
- **Hidden or removed, either is fine.** The tests use `toBeVisible()` and `toBeHidden()`, so an app may
  remove the elements it isn't showing or keep them with the `hidden` attribute. The shared stylesheet ends
  with `[hidden] { display: none !important; }` so that `hidden` wins over `display: flex`.
- **Wrappers are fine.** A mount `<div id="app">`, a custom element host such as `<tasklet-app>`, or
  Angular's `<app-root>` may wrap `<main>`. Open shadow roots are fine too, because Playwright's role and CSS
  locators pierce them. Inside the list, keep `<li>` as the direct child of `<ul>`: HTML allows only `<li>` and
  script-supporting elements there. The Lit app renders each `<li>` in the parent and its `<task-item>` inside
  it, with `display: contents` on the host so the shared flex layout still applies.

The roles come from the elements' built-in semantics: `<main>` is `main`, `<form>` with an accessible name is
`form`, `<ul>` is `list`, `<li>` is `listitem`. That is why the contract asks for those elements rather than
`<div>`s with roles.

## Shared files

`tasklet/shared/` holds the two files every app copies unchanged. Apps are standalone, so they copy the
files instead of importing them from outside their folder.

**`tasks.json`**, the seed data, goes into the app's static folder (`public/` in every app) so that
`GET ./tasks.json` works from the app's root URL:

```json
[
  { "id": "1", "title": "Read the Vue chapter", "done": false },
  { "id": "2", "title": "Try Svelte runes", "done": false },
  { "id": "3", "title": "Write a signal from scratch", "done": true }
]
```

Two of the three tasks aren't done, so a freshly loaded app reads "2 tasks left".

**`tasklet.css`**, the stylesheet, goes into `src/` and is imported once (htmx serves it from `public/`).
It styles the class names of the DOM contract (`.tasklet`, `.add`, `.filters` with
`button[aria-pressed="true"]`, `.tasks`, `.task`, `.task.done span`, `.delete`, `.empty`, `.footer`,
`.count`) plus `[role="status"]` and `[role="alert"]`, and follows the system's light or dark color scheme
through `prefers-color-scheme`. It gives every app the same look. With shadow DOM you have to get it into the
shadow root yourself; [Chapter 12](12-lit-and-web-components.md#shadow-dom-or-not) shows the options.

## The acceptance tests

The suite lives in [`tasklet/e2e/`](tasklet/e2e/), a small package of its own with `@playwright/test`
1.64.1 as its only dependency. It runs in Chromium against the app's production build. Every test gets a
fresh browser context, so `localStorage` starts empty unless the test fills it.

| File | Role |
|---|---|
| `tasklet/e2e/app.ts` | Reads and validates `tasklet/<APP>/tasklet.json`; shared by the config and the tests |
| `tasklet/e2e/playwright.config.ts` | Chromium only; `baseURL` from the manifest's port; starts the app's `serve` command unless told not to |
| `tasklet/e2e/tests/tasklet.spec.ts` | The 15 tests |
| `tasklet/e2e/run-all.mjs` | Builds, serves, tests and stops one or more apps, then prints a summary |

Most tests check the list with one helper, `expectTasks`, which compares the visible items with an expected
list of `[title, done]` pairs. For each item, in order, it checks that the checkbox named exactly the title
exists and is checked or not, that the `<li>` has the class `task` and has `done` exactly when the task is
done, and that the button named `Delete "<title>"` shows `×`. It also checks the number of items, so a
missing or extra task fails.

The titles below are verbatim; a `skip` entry in a manifest must use them exactly. The line is where the
test starts in `tasklet.spec.ts`.

| # | Title | Line | What it checks |
|---|---|---|---|
| 1 | `shows the heading "Tasklet" and the form, filter and list roles` | 129 | After the seed loads: a `main` landmark; a level-1 heading "Tasklet"; a form named "Add task" with a textbox "New task" and a button "Add" of `type="submit"`; the Filter group's buttons read exactly All, Active, Done; `p.count` has `aria-live="polite"` |
| 2 | `shows "Loading tasks…" while tasks.json loads, then the seed tasks` | 141 | Holds back the `tasks.json` response. Meanwhile the status reads "Loading tasks…" and the list, the count and the alert are hidden. After the response: the three seed tasks, no loading status, "2 tasks left" |
| 3 | `shows an error for a failed response and Retry loads the tasks` | 159 | Answers the first request with HTTP 500. The alert reads "Couldn't load tasks.", Retry is visible with `type="button"`, and the status, the list and the count are hidden. Clicking Retry shows the loading status again and hides the alert (the second response is held back); then the seed tasks, no Retry, "2 tasks left", and exactly two requests in total |
| 4 | `shows the error for a network failure too` | 190 | Aborts the first request as a network failure. The alert appears; Retry loads the seed tasks and the alert goes away |
| 5 | `adds a trimmed task, clears the input and ignores blank titles` | 204 | Types "  Learn Qwik  " and clicks Add: the task is appended, its `<span>`'s `textContent` is exactly "Learn Qwik", the field is empty, "3 tasks left". Then Enter with "   " adds nothing, and Enter with "Try Lit" adds a fifth task; "4 tasks left" |
| 6 | `toggles a task with its checkbox` | 223 | Clicking a checkbox marks the task done (class `done`, "1 task left"). Clicking a task's title text toggles it too, because the label wraps the checkbox. Ends with every task undone, "3 tasks left" |
| 7 | `deletes a task with its Delete button` | 244 | `Delete "Try Svelte runes"` removes that task, then `Delete "Write a signal from scratch"` removes the done one; the count follows |
| 8 | `filters All, Active and Done with aria-pressed` | 257 | `aria-pressed` is `"true"` on the current button and `"false"` on the other two, for each filter. Active shows the two open tasks; completing one there removes it from view; Done shows the two done ones; the count ignores the filter; All shows all three |
| 9 | `shows "Nothing to show." when no task matches the filter` | 295 | No empty message at first. Under Done, after unchecking the only done task: "Nothing to show." with class `empty`, the list hidden, "3 tasks left". Back on All after deleting every task: the empty message again, "0 tasks left" |
| 10 | `counts the tasks left with correct pluralization` | 315 | "2 tasks left", "1 task left", "0 tasks left", "1 task left" as checkboxes change |
| 11 | `Clear done is disabled with no done tasks and removes the done ones` | 326 | Clear done is enabled and has `type="button"`; clicking it removes the done task and disables it. Completing both remaining tasks enables it again; clicking it leaves "Nothing to show.", "0 tasks left" and a disabled button |
| 12 | `saves the list to localStorage after every change` | 347 | `localStorage["tasklet:v1"]` equals the seed after the first fetch, then after an add (the new task has a UUID version 4 `id` and `done: false`), a toggle, a delete and Clear done. Each check polls, so saving a moment later is fine |
| 13 | `uses tasks saved in localStorage without fetching tasks.json` | 370 | Puts two tasks into storage before the page loads: the app shows them, "1 task left", and requests `tasks.json` zero times. After deleting both, storage holds `[]`; after a reload the app still makes no request and shows "Nothing to show." with "0 tasks left" |
| 14 | `ignores invalid saved data and fetches tasks.json` | 398 | Puts `{ not json` into storage: the app requests `tasks.json` exactly once and shows the seed tasks |
| 15 | `keeps changes after a reload, with the filter back on All` | 406 | Adds "Persist me", completes one task, deletes another and selects Done; after `page.reload()`, the same three tasks in the same order, All pressed, "1 task left" |

Tests 2, 3 and 4 control the network with `page.route('**/tasks.json', …)`, which is why apps must fetch
the seed with a relative URL ending in `tasks.json`. Tests 13 and 14 fill storage with an init script that
runs only on the first load of the page (it remembers that in `sessionStorage`), so a later reload sees
what the app saved rather than the test's data.

## The manifest: `tasklet.json`

Each app folder has a `tasklet.json` that tells the harness how to handle it. Vue's:

```json
{
  "name": "Vue",
  "port": 4303,
  "build": "npm run build",
  "serve": "npm run preview",
  "persistence": "localStorage",
  "skip": []
}
```

| Field | Meaning |
|---|---|
| `name` | Display name, used in `run-all.mjs`'s headings and `compare.mjs`'s table |
| `port` | The port the app is served on. The suite's base URL is `http://localhost:<port>/` |
| `build` | Shell command run in the app folder to produce the production build. It must exit with a non-zero status on type errors, so for TypeScript apps it type-checks before bundling |
| `serve` | Shell command that serves the production build on `port` and keeps running until it is stopped. Use a preview server with a strict port (fail rather than pick another port), not the dev server |
| `persistence` | `"localStorage"`, or `"server"` for an app that keeps its tasks on its own server. See [Server mode](#server-mode) |
| `skip` | Tests that can't apply to the app, as `[{ "test": "<exact title>", "reason": "<why>" }]`. A skipped test is reported as skipped with its reason |

`app.ts` adds the folder name as `id` and checks the manifest before any test runs. These are its errors:

| Problem | Error |
|---|---|
| `APP` not set | `Set APP to the app folder to test, for example: APP=vue npx playwright test` |
| No manifest in the folder | `No manifest at <folder>/tasklet.json` |
| `port` isn't an integer | `<file>: "port" must be a number` |
| `persistence` is anything else | `<file>: "persistence" must be "localStorage" or "server"` |
| A `skip` title matches no test | `<app>/tasklet.json skips an unknown test: "<title>"` |

The last check exists so that a typo can't silently skip nothing: the suite refuses to load instead. A
missing `skip` is the same as `[]`.

## Server mode

An app whose data lives on a server (htmx in this course) sets `"persistence": "server"`. That changes
three things:

1. **Reset before every test.** Before each test that isn't skipped, the suite sends `POST /__reset` to the
   app's own origin and fails with `POST /__reset must succeed` unless the response is 2xx. The server must
   handle that request on the port that serves the app, need no body, put the three seed tasks back (same
   ids, order and `done` flags) and answer only when it has done so. The htmx server answers
   `204 No Content` ([`tasklet/htmx/src/server.ts`](tasklet/htmx/src/server.ts), lines 56–60).
2. **One test at a time.** All tests share the server's one task list, so the config turns off parallel
   runs and uses a single worker.
3. **Persistence through the server.** The server keeps the list in memory for as long as it runs, and
   `GET /` returns the page with the tasks already rendered. Test 15, the reload test, is the persistence
   test in this mode.

Six tests look at the client-side fetch or at `localStorage`, which a server-rendered app doesn't have. The
htmx manifest skips them with these reasons:

| Skipped test | Reason in `tasklet/htmx/tasklet.json` |
|---|---|
| `shows "Loading tasks…" while tasks.json loads, then the seed tasks` | The server renders the tasks into the page; there is no client-side fetch or loading state. |
| `shows an error for a failed response and Retry loads the tasks` | No client-side fetch of tasks.json: the server reads it once at startup. |
| `shows the error for a network failure too` | No client-side fetch of tasks.json: the server reads it once at startup. |
| `saves the list to localStorage after every change` | Tasks persist on the server (in memory), not in localStorage. |
| `uses tasks saved in localStorage without fetching tasks.json` | Tasks persist on the server (in memory), not in localStorage. |
| `ignores invalid saved data and fetches tasks.json` | Tasks persist on the server (in memory), not in localStorage. |

The other nine tests must pass. One pitfall: `page.reload()` keeps the URL, so an app that writes the
filter into the URL (with `hx-push-url`, say) and restores it on a full page load fails the reload test,
which expects the filter back on All. [Chapter 13](13-htmx.md#the-manifest-and-the-skips) explains the
skips from the htmx side.

## Running the suite

Install the suite's dependencies once, then use `run-all.mjs` for one app, several or all:

```sh
cd tasklet/e2e
npm ci                                   # once: installs @playwright/test
npx playwright install chromium          # once, if Playwright has no Chromium yet
node run-all.mjs vanilla                 # one app
node run-all.mjs vue svelte solid        # several
node run-all.mjs                         # every folder in tasklet/ that has a tasklet.json
```

For each app, `run-all.mjs`:

1. runs `npm ci` in the app folder if `node_modules/` is missing;
2. runs the manifest's `build` command;
3. checks that nothing already answers on the app's port; if something does, it doesn't test that app and
   notes `port <N> already in use`, so it never tests the wrong server;
4. starts the `serve` command in its own process group and waits up to 60 seconds for the port to answer;
5. runs `npx playwright test` with `APP=<folder>`, `TASKLET_WEBSERVER=0` and a JSON report in
   `tasklet/e2e/test-results/run-all/<folder>.json`;
6. stops the server by signaling its process group (`SIGTERM`, then `SIGKILL` after five seconds).

It ends with a summary table and exits with status 0 only if every app built, started, passed at least one
test and failed none. A note such as `build failed`, `server did not start` or `npm ci failed` explains a
row that didn't get that far. This is the real output of `node run-all.mjs vanilla`:

```text
=== Vanilla TypeScript (tasklet/vanilla, port 4301) ===

$ npm run build    (in /home/tbangma/learn-web-frameworks/tasklet/vanilla)

> tasklet-vanilla@0.0.0 build
> tsc && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 12 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.41 kB │ gzip: 0.28 kB
dist/assets/index-BeKL5seo.css  2.38 kB │ gzip: 0.95 kB
dist/assets/index-DetuhChd.js   4.32 kB │ gzip: 1.92 kB

✓ built in 89ms

$ npm run preview &    (in /home/tbangma/learn-web-frameworks/tasklet/vanilla)

> tasklet-vanilla@0.0.0 preview
> vite preview --port 4301 --strictPort

  ➜  Local:   http://localhost:4301/
  ➜  Network: use --host to expose

$ npx playwright test    (in /home/tbangma/learn-web-frameworks/tasklet/e2e)

Running 15 tests using 15 workers

  ✓   5 [chromium] › tests/tasklet.spec.ts:398:1 › ignores invalid saved data and fetches tasks.json (423ms)
  ✓  13 [chromium] › tests/tasklet.spec.ts:141:1 › shows "Loading tasks…" while tasks.json loads, then the seed tasks (473ms)
  ✓   2 [chromium] › tests/tasklet.spec.ts:129:1 › shows the heading "Tasklet" and the form, filter and list roles (483ms)
  ✓  14 [chromium] › tests/tasklet.spec.ts:190:1 › shows the error for a network failure too (486ms)
  ✓   6 [chromium] › tests/tasklet.spec.ts:159:1 › shows an error for a failed response and Retry loads the tasks (544ms)
  ✓  12 [chromium] › tests/tasklet.spec.ts:315:1 › counts the tasks left with correct pluralization (578ms)
  ✓   3 [chromium] › tests/tasklet.spec.ts:244:1 › deletes a task with its Delete button (593ms)
  ✓   7 [chromium] › tests/tasklet.spec.ts:347:1 › saves the list to localStorage after every change (650ms)
  ✓   1 [chromium] › tests/tasklet.spec.ts:295:1 › shows "Nothing to show." when no task matches the filter (689ms)
  ✓   9 [chromium] › tests/tasklet.spec.ts:326:1 › Clear done is disabled with no done tasks and removes the done ones (688ms)
  ✓  11 [chromium] › tests/tasklet.spec.ts:223:1 › toggles a task with its checkbox (718ms)
  ✓   8 [chromium] › tests/tasklet.spec.ts:204:1 › adds a trimmed task, clears the input and ignores blank titles (781ms)
  ✓   4 [chromium] › tests/tasklet.spec.ts:406:1 › keeps changes after a reload, with the filter back on All (793ms)
  ✓  10 [chromium] › tests/tasklet.spec.ts:257:1 › filters All, Active and Done with aria-pressed (797ms)
  ✓  15 [chromium] › tests/tasklet.spec.ts:370:1 › uses tasks saved in localStorage without fetching tasks.json (1.3s)

  15 passed (2.1s)

Summary
app      port  build  passed  failed  skipped  note
vanilla  4301  ok     15      0       0
```

The tests run in parallel, so they finish in a different order each time. For htmx the summary row reads
`9` passed and `6` skipped.

### Running Playwright by hand

You can also run Playwright directly. Build the app first; the config then starts the app's `serve`
command in the app folder, or reuses a server that already answers on the port, and stops what it started:

```sh
(cd tasklet/vue && npm run build)
cd tasklet/e2e
APP=vue npx playwright test                         # the whole suite
APP=vue npx playwright test -g "toggles"            # tests whose title matches
APP=vue npx playwright test --reporter=line         # quieter output
```

| Variable | Meaning |
|---|---|
| `APP` | Required. The folder under `tasklet/` to test |
| `BASE_URL` | Overrides `http://localhost:<port>/`, for example to test a copy of an app on another port |
| `TASKLET_WEBSERVER=0` | Don't start a server; one is already running. `run-all.mjs` sets it |
| `TASKLET_RESULTS=<file>` | Also write a JSON report to `<file>`. `run-all.mjs` sets it |

Failed tests keep a trace in `tasklet/e2e/test-results/`; open one with
`npx playwright show-trace <path>/trace.zip`. The config also sets `forbidOnly` (a stray `test.only` fails
the run) and no retries, so a flaky app shows up as failing.

Always test the production build. In development some frameworks behave differently on purpose: React's
Strict Mode, for example, runs every Effect twice, so the error test (which fails only the first request)
never sees an error.

## Measuring

### `size.mjs`

`tasklet/tools/size.mjs` measures a build output folder: the raw size and the gzip size (zlib level 9) of
every `.js`, `.mjs`, `.css` and `.html` file in it, source maps excluded, per file and in total. It counts
1 kB as 1000 bytes, like Vite's build output. Vite's own gzip column uses a different compression level, so
when the two differ slightly, quote `size.mjs`.

```sh
node tasklet/tools/size.mjs <build-folder> [--json]
```

```console
$ node tasklet/tools/size.mjs tasklet/vanilla/dist
file                              raw        gzip
assets/index-BeKL5seo.css     2.38 kB     0.95 kB
assets/index-DetuhChd.js      4.32 kB     1.93 kB
index.html                    0.41 kB     0.28 kB
total                         7.12 kB     3.16 kB
```

With `--json` it prints `{ "dir", "files": [{ "file", "raw", "gzip" }], "total": { "raw", "gzip" } }` with
sizes in bytes. Point it at the folder the browser is served from: `dist/` for most apps,
`dist/angular/browser/` for Angular.

### `compare.mjs`

`tasklet/tools/compare.mjs` measures every app the same way, one after the other, and prints a Markdown
table. [Chapter 19](19-comparing-frameworks.md#measuring-tasklet) shows a full run and discusses the
numbers.

```sh
node tasklet/tools/compare.mjs [app …] [--runs N] [--json]
```

Without app names it measures every folder that has a `tasklet.json`, in port order. For each app it
reports:

- **Build time:** the manifest's `build` command run N times (3 by default), and the median wall-clock
  time. `npm ci` runs first, untimed, if `node_modules/` is missing.
- **Size:** what the browser can download, measured like `size.mjs` (files, raw kB, gzip kB, JS gzip kB, and
  the ratio to vanilla's gzip total). htmx has no build output, so the tool starts its server, resets it,
  and measures the page `GET /` returns plus every script and stylesheet it links to. That needs the app's
  port to be free.
- **Source lines:** the newline count, as `wc -l` gives it, of the app's own source: files under `src/`
  ending in `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`, `.svelte` or `.html`, without type declarations
  (`.d.ts`), unit tests (`.spec`/`.test`) or Angular's `src/index.html`. Alpine's template lives in the
  root `index.html`, so that file is counted for Alpine. CSS, `tasks.json` and configuration aren't counted.
- **Version:** the installed version of the app's main package, read from `node_modules/`.

The table has the columns App, Version, Files, Raw kB, Gzip kB, JS gzip kB, × vanilla, Source lines
(files) and Build s (median). Progress lines go to standard error. The tool also writes every measurement,
including each build time and the list of files counted as source, to `tasklet/tools/compare-results.json`,
replacing the previous results; `--json` prints that report as well.

## Adding a new implementation

These steps add `tasklet/myapp/` for a framework of your choice. They are the steps the course's thirteen
apps followed. The commands use a Vite template; for a framework with its own starter, use that and adapt
the scripts.

1. **Pick a folder name and a port.** Use a lowercase folder name and port 4314 or higher. Ports 4301–4313
   belong to the course's apps; the exercise scripts of Chapters 7 and 8 serve on 4315 and 4316, and
   chapter examples use 4320 plus the chapter number. 4314 is free.

2. **Scaffold** from `tasklet/` with the framework's official starter, so that your setup matches what its
   users get. For a Vite-based framework without a template of its own, start from `vanilla-ts`:

   ```sh
   cd tasklet
   npm create vite@latest myapp -- --template vanilla-ts
   ```

   Delete the demo code, assets and styles, and the app's own `.gitignore` (the course root has one). Rename
   the package to `tasklet-myapp`.

3. **Pin exact versions**, as every course app does: no `^` or `~` in `package.json`, and a
   `package-lock.json` that `npm ci` accepts.

   ```sh
   cd myapp
   npm install --save-exact --save-dev typescript@7.0.2 vite@8.3.5
   ```

4. **Set the scripts** to your port. `build` must type-check a TypeScript app, and `preview` must serve the
   production build on the fixed port and fail if the port is taken:

   ```json
   "scripts": {
     "dev": "vite --port 4314 --strictPort",
     "build": "tsc && vite build",
     "preview": "vite preview --port 4314 --strictPort"
   }
   ```

   A tool without a preview server needs another way to serve its build output; Angular, for example, uses
   `http-server dist/angular/browser -p 4305 -c-1`.

5. **Copy the shared files** unchanged, and import the stylesheet once (for example
   `import './tasklet.css'` in your entry module):

   ```sh
   cp ../shared/tasks.json public/
   cp ../shared/tasklet.css src/
   ```

6. **Build the app** to the [behavior](#behavior) and [DOM contract](#the-dom-contract) above. A checklist
   of the details that the tests catch:
   - read `localStorage["tasklet:v1"]` first, and treat anything that isn't an array of
     `{ id: string, title: string, done: boolean }` as missing;
   - fetch `./tasks.json` with a relative URL, and treat `!response.ok` as an error;
   - save the whole list after every change, including the first successful fetch;
   - create ids with `crypto.randomUUID()`;
   - count the tasks that aren't done across all tasks, not only the visible ones;
   - show the count and Clear done only when the tasks are loaded;
   - render `aria-pressed` as `"true"`/`"false"` on all three filter buttons, and keep the filter out of
     storage and the URL.

   The app in [`tasklet/vanilla/`](tasklet/vanilla/) is the plainest model to compare with, and
   [Appendix A](appendix-a-rosetta-stone.md) shows each building block in thirteen frameworks.

7. **Write `tasklet.json`**:

   ```json
   {
     "name": "My App",
     "port": 4314,
     "build": "npm run build",
     "serve": "npm run preview",
     "persistence": "localStorage",
     "skip": []
   }
   ```

   If your app keeps its data on a server, read [Server mode](#server-mode): set `"persistence": "server"`,
   handle `POST /__reset`, and skip the six tests that can't apply, each with a reason.

8. **Run the suite** until it passes:

   ```sh
   cd ../e2e
   node run-all.mjs myapp
   ```

   To iterate on one failing test, build, then run Playwright by hand with a title filter, such as
   `APP=myapp npx playwright test -g "toggles"`. The trace of a failed test shows the page at every step.
   From now on, `node run-all.mjs` without arguments tests your app along with the others.

9. **Measure** it:

   ```sh
   cd ..
   node tools/size.mjs myapp/dist
   node tools/compare.mjs vanilla myapp
   ```

   `compare.mjs` reports "—" as the version of a framework it doesn't know, expects your source under
   `src/`, and replaces `tools/compare-results.json`.

10. **Check that nothing is left running.** `run-all.mjs` stops the servers it starts. A preview server you
    started yourself keeps the port busy, and the next `run-all.mjs` reports `port 4314 already in use`
    until you stop it.

This sequence was tried with a copy of the vanilla app in a scratch folder: scaffolded with create-vite
9.3.3, pinned, built, served with `vite preview --port 4314 --strictPort` and tested with
`APP=vanilla BASE_URL=http://localhost:4314/ TASKLET_WEBSERVER=0 npx playwright test`, it passed all 15
tests, and `size.mjs` reported the same 3.16 kB as the original.
