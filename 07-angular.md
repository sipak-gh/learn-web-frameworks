# Chapter 7 — Angular

React, Vue and Svelte are libraries for building user interfaces. You choose the router, the forms library,
the HTTP client and the test runner yourself, or a meta-framework chooses them for you. Angular is a
*platform*: one team at Google ships the component model, the compiler, the router, forms, an HTTP client,
internationalization, server rendering, the test setup and the command-line tool that ties them together,
all released together under the same version number. This chapter builds Tasklet with Angular 22, the
version that came out in June 2026, and uses its current style throughout: standalone components, signals,
the built-in `@if`/`@for` control flow, zoneless change detection, `httpResource` for the fetch and Signal
Forms for the input. It also explains what came before (decorators, NgModules, Zone.js, RxJS everywhere),
because most Angular code you will meet at work was written that way.

## At a glance

| | |
| --- | --- |
| First released | AngularJS in October 2010; Angular (the rewrite) 2.0 in September 2016 |
| Current version | 22.2.4 (October 29, 2026); 22.3 is expected in November 2026 |
| Created by / maintained by | The Angular team at Google, which employs the core team and funds the project |
| License | MIT |
| Rendering model | Compiled: each template becomes a function of DOM instructions with a creation pass and an update pass; no virtual DOM. Change detection refreshes the bindings of components marked dirty |
| Reactivity model | Signals (`signal`, `computed`, `effect`, `linkedSignal`, `resource`) notify the scheduler; zoneless by default since v21, `OnPush` by default since v22. RxJS Observables for streams |
| Templates | HTML files (or inline strings) with `{{ }}`, `[property]`, `(event)` and `@if`/`@for`/`@switch` blocks, attached to a TypeScript class with the `@Component` decorator |
| Language | TypeScript 6.0 (Angular 22.2 accepts `>=6.0 <6.1`; TypeScript 7 isn't supported yet) |
| Tasklet build size | 76.97 kB gzip (241.20 kB raw), measured with `tasklet/tools/size.mjs` |
| Meta-framework | Server rendering is built in (`@angular/ssr`); Analog adds file-based routing ([Chapter 18](18-meta-frameworks-and-rendering.md)) |
| Good fit for | Large applications and large teams that want one official answer for routing, forms, HTTP, i18n and testing, long support windows and a scheduled upgrade path |

## Why it exists

[Chapter 2](02-a-short-history.md) tells the first half of the story. AngularJS (2010) made two-way data
binding popular, and it found changes by *dirty checking*: after every event it re-evaluated every binding
on the page and compared the results. That got slow as pages grew. Google's answer was not an upgrade but a
new framework. Angular 2.0, released in September 2016, kept the name and the ambitions (dependency
injection, testability, a complete toolkit) and changed everything else: it was written in TypeScript, built
from components declared with decorators, organized into NgModules, and it used two other libraries for the
hard parts. **Zone.js** patched the browser's asynchronous APIs (`setTimeout`, `addEventListener`,
`Promise`, XHR) so that Angular knew when *any* async task finished and could check the component tree.
**RxJS** supplied Observables for HTTP, router events and forms.

The audience was large teams writing large applications, many of them inside Google. That explains the
choices that still define Angular. Everything is typed. Structure is prescribed: a component is a class, a
service is a class, and the CLI generates both. The pieces you need for a business application (routing,
forms with validation, HTTP with interceptors, i18n, a testing harness) are part of the framework, not
picked from npm, and they are upgraded together with automated migrations (`ng update`). The documentation
describes the goal in those terms:

> Angular gives you a solid platform on which to build fast, reliable applications that scale with both
> the size of your team and the size of your codebase.
>
> — Angular documentation, "What is Angular?" (2026)

The last three years changed how Angular code looks more than anything since 2016. Standalone components
(default since v17) made NgModules optional. Signals arrived in v16 (May 2023) and now drive change
detection. The built-in control flow (`@if`, `@for`) replaced the `*ngIf` and `*ngFor` directives in v17.
Zoneless change detection went from experimental in v18 to stable in v20.2 and became the default for new
applications in v21 (November 2025). In v22 (June 2026), components are `OnPush` by default, and Signal
Forms and the async signal APIs (`resource`, `httpResource`) became stable. The release announcement put it
like this:

> Signal Forms, Asynchronous Signals, and Angular Aria are now stable, offering a production-ready reactive
> foundation.
>
> — Angular team, "Angular v22" (2026)

## The mental model

An Angular application is a tree of components, each a TypeScript class with a template. The compiler turns
every template into a function with two passes: a **creation pass** that builds the component's DOM once,
and an **update pass** that re-evaluates the template's bindings and writes the ones whose values changed.
There is no virtual DOM; the update pass compares each binding with the value it wrote last time.

**Change detection** is the process of running update passes. The question every version of Angular has had
to answer is *when* to run them and *for which components*.

```text
  Angular 2–20 with Zone.js (the old default)        Angular 21+ zoneless, 22+ OnPush (today)

  any async task finishes                            a signal read by a template changes,
  (click, timer, XHR, Promise)                       or a template event handler runs
        │                                                  │
        ▼                                                  ▼
  Zone.js tells Angular                              that component (and its ancestors)
        │                                            is marked dirty; a render is scheduled
        ▼                                                  │
  check the whole tree from the root,                      ▼
  every binding of every component                   refresh only the views marked dirty
  (OnPush components skipped unless
   their inputs changed)
```

With Zone.js, Angular didn't need to know *what* changed; it re-checked everything after anything async
happened, the same idea as AngularJS's digest loop but faster. Without Zone.js, something has to tell
Angular that a view needs refreshing. In a modern Angular app that is almost always a **signal**:

- `signal(value)` creates a writable signal. Read it by calling it (`count()`), write it with
  `set` or `update`.
- `computed(() => …)` derives a value from other signals. It is lazy and cached, and it recomputes only
  when a signal it read changes.
- `effect(() => …)` runs a side effect whenever the signals it read change. It must be created in an
  *injection context* (a constructor or field initializer), which also ties its lifetime to the component
  or service.
- `linkedSignal(() => …)` is a writable signal whose value is reset whenever its source changes.
- `resource` and `httpResource` turn async work into signals: `value()`, `status()`, `isLoading()`,
  `error()`, plus `reload()`.

When a template reads a signal, Angular records the dependency for that component's view. When the signal
changes, Angular marks the view dirty and schedules a render. Event handlers bound in a template (`(click)`)
also mark their component dirty. Other changes don't: if code inside a `setTimeout` writes a plain class
field, nothing refreshes until something else marks the view. Exercise 1 shows this.

Compared with the signal libraries you'll meet in later chapters, Angular's granularity is the
*component view*, not the individual DOM node. A signal change refreshes the whole template of each affected
component, but only those components, and the update pass only writes bindings whose values differ. That's
the same unit of work as Vue's component re-render, without a virtual DOM in between.

### What the compiler produces

You can see both passes by compiling `TaskItem` from the Tasklet app with `ngc`, the Angular compiler
(`examples/ch07/compile/compile.sh`). This is an excerpt of `examples/ch07/compile/out/task-item/task-item.js`:

```js
    static ɵfac = function TaskItem_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TaskItem)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TaskItem, selectors: [["li", "app-task-item", ""]], hostAttrs: [1, "task"], hostVars: 2, hostBindings: function TaskItem_HostBindings(rf, ctx) { if (rf & 2) {
            i0.ɵɵclassProp("done", ctx.task().done);
        } }, inputs: { task: [1, "task"] }, outputs: { toggle: "toggle", remove: "remove" }, decls: 6, vars: 3, consts: [["type", "checkbox", 3, "change", "checked"], ["type", "button", 1, "delete", 3, "click"]], template: function TaskItem_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "label")(1, "input", 0);
            i0.ɵɵdomListener("change", function TaskItem_Template_input_change_1_listener() { return ctx.toggle.emit(); });
            i0.ɵɵdomElementEnd();
            i0.ɵɵdomElementStart(2, "span");
            i0.ɵɵtext(3);
            i0.ɵɵdomElementEnd()();
            i0.ɵɵdomElementStart(4, "button", 1);
            i0.ɵɵdomListener("click", function TaskItem_Template_button_click_4_listener() { return ctx.remove.emit(); });
            i0.ɵɵtext(5, " \u00D7\n");
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵdomProperty("checked", ctx.task().done);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.task().title);
            i0.ɵɵadvance();
            i0.ɵɵattribute("aria-label", ctx.deleteLabel());
        } }, encapsulation: 2 });
```

The decorator is gone. Its metadata became static fields: `ɵfac` is a factory used by dependency injection,
and `ɵcmp` is the component definition. `rf & 1` is the creation pass (elements, listeners, static text),
and `rf & 2` is the update pass, which re-reads `task()` and `deleteLabel()` and writes the `checked`
property, the text and the `aria-label` attribute. The `ɵɵ` prefix marks private instructions you never
call yourself. This compiled form is called *Ivy*, Angular's renderer since v9 (2020). The `dom` variants of the
instructions (`ɵɵdomElementStart`, `ɵɵdomListener`) appear because this template uses no other components or
directives, so the compiler can emit plain DOM operations.

### Decorators, classes and dependency injection

Everything Angular knows about a class comes from a decorator: `@Component` (a class with a template),
`@Directive` (behavior attached to an existing element), `@Pipe` (a template formatting function), and
`@Injectable` or, new in v22, `@Service` (a class that can be injected). Angular uses TypeScript's older
"experimental" decorators (`experimentalDecorators: true` in the generated `tsconfig.json`), not the
standard decorators that TypeScript 5 added, and the compiler rewrites them away, as shown above.

**Dependency injection (DI)** is how Angular code gets its collaborators. Instead of importing a module-level
singleton or passing an object down through props, a class asks for a dependency by type, and an *injector*
supplies the instance:

```text
  root injector       TaskStore (one instance, created on first inject)
        │
  App component  ──── inject(TaskStore) ────┐
        │                                    │ same instance
  any descendant ──── inject(TaskStore) ────┘
```

Injectors form a tree that mirrors the component tree, so a component can provide its own instance for
its subtree, and tests can swap any dependency for a fake. Modern code calls `inject(Type)` in a field
initializer rather than listing dependencies as constructor parameters. `@Service()` is shorthand for
`@Injectable({ providedIn: 'root' })`: one app-wide instance, created lazily and tree-shaken if nothing
injects it.

## Code structure

### Scaffolding

The Angular CLI creates, builds, serves and tests projects. You don't need to install it globally; run a
pinned version through `npx`. `--defaults` accepts every default, so the command never prompts:

```console
$ cd tasklet
$ npx -y @angular/cli@22.2.5 new angular --defaults --skip-git --style=css --ssr=false --ai-config=none --package-manager=npm
CREATE angular/.prettierrc (161 bytes)
CREATE angular/README.md (1460 bytes)
CREATE angular/.editorconfig (314 bytes)
CREATE angular/.gitignore (622 bytes)
CREATE angular/angular.json (1906 bytes)
CREATE angular/package.json (783 bytes)
CREATE angular/tsconfig.json (908 bytes)
CREATE angular/tsconfig.app.json (398 bytes)
CREATE angular/tsconfig.spec.json (409 bytes)
…
CREATE angular/src/main.ts (222 bytes)
CREATE angular/src/index.html (293 bytes)
CREATE angular/src/styles.css (80 bytes)
CREATE angular/src/app/app.css (0 bytes)
CREATE angular/src/app/app.spec.ts (681 bytes)
CREATE angular/src/app/app.ts (290 bytes)
CREATE angular/src/app/app.html (20144 bytes)
CREATE angular/src/app/app.config.ts (312 bytes)
CREATE angular/src/app/app.routes.ts (77 bytes)
CREATE angular/public/favicon.ico (15086 bytes)
- Installing packages (npm)...
✔ Packages installed successfully.
```

`--ssr=false` skips server rendering, `--ai-config=none` skips the AI-assistant rule files that the CLI now
offers to generate, and `--skip-git` leaves version control alone. The project has no `zone.js` dependency
and no `provideZonelessChangeDetection()` call: zoneless is simply the default. Testing is set up with
Vitest and jsdom (the default since v21; Karma is still supported). After trimming, Tasklet's project
looks like this:

```text
tasklet/angular/
├── angular.json          workspace config: builders for build, serve, test
├── package.json
├── tsconfig.json         + tsconfig.app.json, tsconfig.spec.json
├── public/tasks.json     copied to the build output as-is
└── src/
    ├── index.html        <app-root></app-root>
    ├── main.ts           bootstrapApplication(App, appConfig)
    ├── tasklet.css       the shared stylesheet
    └── app/
        ├── app.config.ts     application-wide providers
        ├── app.ts, app.html, app.spec.ts
        ├── task-store.ts     the TaskStore service
        ├── tasks.ts, storage.ts
        ├── task-form/   task-form.ts, task-form.html
        ├── task-item/   task-item.ts, task-item.html
        └── filter-bar/  filter-bar.ts, filter-bar.html
```

Tasklet's version deletes the README, `.gitignore`, `.vscode/`, the favicon, the empty `app.css`, `styles.css` (replaced by
`tasklet.css` in `angular.json`), the 20 kB placeholder page in `app.html`, and `app.routes.ts` with the
`provideRouter(routes)` call that used it, because Tasklet has a single screen. Versions in `package.json`
are pinned exactly.

### Anatomy of a component

A component is a class plus metadata. Since the 2025 style guide, file names have no `.component` suffix:
the class `TaskForm` lives in `task-form.ts` with its template in `task-form.html`.

```text
@Component({
  selector: 'app-task-form',        where it appears: <app-task-form />
  imports: [FormField, FormRoot],   what its template may use
  templateUrl: './task-form.html',  or template: `…` inline
})
export class TaskForm {             state and methods the template binds to
  readonly add = output<string>();
}
```

Every component is *standalone*: it lists what its template uses in `imports`, the way an ES module
imports what it uses. The template syntax is HTML plus four kinds of binding:

| Syntax | Meaning |
| --- | --- |
| `{{ expr }}` | text interpolation |
| `[prop]="expr"`, `[attr.x]`, `[class.x]` | write a DOM property, attribute or class |
| `(event)="statement"` | listen to a DOM event or a component output; `$event` is the payload |
| `[(prop)]="signal"` | two-way binding ("banana in a box"): `[prop]` plus `(propChange)` |
| `@if`, `@for`, `@switch`, `@defer`, `@let` | built-in blocks for control flow, lazy loading and local variables |

Template expressions are type-checked by the compiler (strict templates are the default in v22), so a typo
in `task().titel` fails the build.

## Building Tasklet in Angular

The app has the four components the course uses everywhere (`App`, `TaskForm`, `TaskItem`, `FilterBar`)
and a `TaskStore` service that owns the task list, its persistence and the fetch. `tasks.ts` is the shared
helper module from the React version, unchanged except for formatting. `storage.ts` keeps `loadSavedTasks`
and `saveTasks` and replaces `fetchTasks` with `parseTaskList`, a validator for the response body.

### `package.json`

```json
{
  "name": "tasklet-angular",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "dev": "ng serve --port 4305",
    "build": "ng build",
    "preview": "http-server dist/angular/browser -p 4305 -c-1",
    "test": "ng test --watch=false"
  },
  "private": true,
  "packageManager": "npm@11.20.0",
  "dependencies": {
    "@angular/common": "22.2.4",
    "@angular/compiler": "22.2.4",
    "@angular/core": "22.2.4",
    "@angular/forms": "22.2.4",
    "@angular/platform-browser": "22.2.4",
    "rxjs": "7.8.2",
    "tslib": "2.9.1"
  },
  "devDependencies": {
    "@angular/build": "22.2.5",
    "@angular/cli": "22.2.5",
    "@angular/compiler-cli": "22.2.4",
    "http-server": "14.1.1",
    "jsdom": "30.1.3",
    "prettier": "3.9.10",
    "typescript": "6.0.3",
    "vitest": "5.0.5"
  }
}
```

The builds use `@angular/build`, the CLI's esbuild- and Vite-based builder (the older webpack builders are
deprecated in v22). `ng build` compiles and type-checks the templates, so there is no separate `tsc` step.
`ng serve` already refuses a busy port: with 4305 taken, it stops with "Port 4305 is already in use".

Two choices need explaining:

- **TypeScript 6.0.3, not 7.** The Angular compiler is built on TypeScript's JavaScript API and its
  transformer hooks, which the Go-based TypeScript 7 doesn't offer. `@angular/compiler-cli` 22.2.4
  declares a peer range of `>=6.0 <6.1`. In September 2026 the Angular team described a new compiler front end in
  Rust on Oxc, called ngp for now, that will make TypeScript 7 usable; an experimental version is planned
  for later this year.
- **`http-server` for `preview`.** Angular has no preview command; `ng build` writes static files to
  `dist/angular/browser` and stops. Any static file server will do, so Tasklet adds the small `http-server`
  package, pinned exactly. It fails with `EADDRINUSE` when 4305 is taken, which is the strict-port behavior
  the course wants. The `serve` package, the first choice, moved to another free port even with
  `--no-port-switching`. `-c-1` turns off caching so a rebuild shows up immediately.

`main.ts` and `app.config.ts` stay as generated, minus the router:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
```

That's the whole configuration. HttpClient has been injectable without `provideHttpClient()` since v21,
and it uses `fetch` by default since v22. You add `provideHttpClient(…)` only to configure it, for example
with interceptors.

### `task-store.ts`

```ts
import { httpResource } from '@angular/common/http';
import { computed, effect, linkedSignal, Service } from '@angular/core';
import { loadSavedTasks, parseTaskList, saveTasks } from './storage';
import type { Task } from './tasks';

@Service()
export class TaskStore {
  private readonly saved = loadSavedTasks();

  // GET ./tasks.json only when nothing valid was saved. Returning undefined
  // keeps the resource idle, so it never sends a request.
  private readonly seed = httpResource(() => (this.saved ? undefined : './tasks.json'), {
    parse: parseTaskList,
  });

  // The task list: the saved one, else the fetched one (null until it arrives).
  // A linkedSignal is writable, so add/toggle/remove can set it locally.
  readonly tasks = linkedSignal<Task[] | null>(
    () => this.saved ?? (this.seed.hasValue() ? this.seed.value() : null),
  );
  readonly loading = this.seed.isLoading;
  readonly failed = computed(() => this.seed.status() === 'error');

  constructor() {
    // Sync the list to localStorage after every change.
    effect(() => {
      const tasks = this.tasks();
      if (tasks) saveTasks(tasks);
    });
  }

  retry(): void {
    this.seed.reload();
  }

  add(title: string): void {
    this.tasks.update((tasks) => [
      ...(tasks ?? []),
      { id: crypto.randomUUID(), title, done: false },
    ]);
  }

  toggle(id: string): void {
    this.tasks.update(
      (tasks) =>
        tasks && tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  remove(id: string): void {
    this.tasks.update((tasks) => tasks && tasks.filter((task) => task.id !== id));
  }

  clearDone(): void {
    this.tasks.update((tasks) => tasks && tasks.filter((task) => !task.done));
  }
}
```

This one class covers half of the Tasklet contract: async data with loading and error states, persistence,
and every change to the list. Components only read its signals and call its methods.

- **The fetch.** `httpResource` takes a function that returns a URL (or a request object). It reads that
  function in a reactive context, sends a GET through `HttpClient` whenever the URL changes, and exposes the
  result as signals. When the function returns `undefined` the resource stays idle, which is how the store
  skips the request when `localStorage` already has a valid list. `parse` validates the JSON body; if it
  throws, the resource's status becomes `'error'`, the same as for a 500 or a network failure. `reload()`
  sends the request again, and `isLoading()` is true again while it runs, so Retry shows "Loading tasks…".
- **Why `httpResource`.** The traditional Angular way is `inject(HttpClient).get<Task[]>(url)`, which
  returns an RxJS Observable you subscribe to, then copy into fields or signals yourself. `httpResource` is
  the signal-first wrapper around the same client: it keeps HttpClient's interceptors, testing utilities and
  server-rendering transfer cache, and it hands you loading, error and value states without writing them.
  It has been stable since v22. The cost is size: it pulls in HttpClient. Plain `fetch` inside the generic
  `resource()` works too and is about 8.7 kB smaller (Exercise 3).
- **The list.** `tasks` is a `linkedSignal`: its value follows the computation (the saved list, or the
  fetched one once it arrives), but you can also `update` it. Each method writes a new array, as in React,
  because a signal notifies only when its value changes by identity. Mutating `task.done` in place would
  not be seen.
- **Persistence.** The `effect` reads `tasks()`, so it runs once at start and again after every change,
  including the one caused by the fetch. Effects run as part of change detection, after the signals settle,
  so several changes in one event produce one write.

### `app.ts` and `app.html`

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { FilterBar } from './filter-bar/filter-bar';
import { TaskForm } from './task-form/task-form';
import { TaskItem } from './task-item/task-item';
import { TaskStore } from './task-store';
import { countLabel, visibleTasks, type Filter } from './tasks';

@Component({
  imports: [FilterBar, TaskForm, TaskItem],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(TaskStore);
  protected readonly filter = signal<Filter>('all');

  protected readonly visible = computed(() =>
    visibleTasks(this.store.tasks() ?? [], this.filter()),
  );
  protected readonly countLabel = computed(() => countLabel(this.store.tasks() ?? []));
  protected readonly anyDone = computed(
    () => this.store.tasks()?.some((task) => task.done) ?? false,
  );
}
```

```html
<main class="tasklet">
  <h1>Tasklet</h1>
  <app-task-form (add)="store.add($event)" />
  <app-filter-bar [(filter)]="filter" />

  @if (store.loading()) {
    <p role="status">Loading tasks…</p>
  } @else if (store.failed()) {
    <p role="alert">Couldn't load tasks.</p>
    <button type="button" (click)="store.retry()">Retry</button>
  } @else if (store.tasks()) {
    @if (visible().length === 0) {
      <p class="empty">Nothing to show.</p>
    } @else {
      <ul class="tasks" aria-label="Tasks">
        @for (task of visible(); track task.id) {
          <li
            app-task-item
            [task]="task"
            (toggle)="store.toggle(task.id)"
            (remove)="store.remove(task.id)"
          ></li>
        }
      </ul>
    }
    <footer class="footer">
      <p class="count" aria-live="polite">{{ countLabel() }}</p>
      <button type="button" class="clear" [disabled]="!anyDone()" (click)="store.clearDone()">
        Clear done
      </button>
    </footer>
  }
</main>
```

`App` injects the store and keeps the one piece of state that belongs to the view, the filter. The derived
values are `computed` signals, so the template calls them like functions. Members the template uses are
`protected`: visible to the template, not to other classes.

The template maps the contract almost line by line. `@if … @else if` picks loading, error or the list.
`@for` requires a `track` expression, the equivalent of React's `key`; `track task.id` lets Angular move,
keep or remove each row's DOM when the array changes. `@for` also has an `@empty` block for an empty list,
but Tasklet doesn't use it: the contract wants the empty message *instead of* the `<ul>`, and `@empty`
renders inside the loop's parent (Exercise 4). `(add)="store.add($event)"` listens to the form's output;
`[(filter)]="filter"` binds the filter signal both ways.

### `task-item.ts` and `task-item.html`

```ts
import { Component, computed, input, output } from '@angular/core';
import type { Task } from '../tasks';

// An attribute selector: the <li> itself is the component's host element.
@Component({
  selector: 'li[app-task-item]',
  templateUrl: './task-item.html',
  host: { class: 'task', '[class.done]': 'task().done' },
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly toggle = output();
  readonly remove = output();

  protected readonly deleteLabel = computed(() => `Delete "${this.task().title}"`);
}
```

```html
<label>
  <input type="checkbox" [checked]="task().done" (change)="toggle.emit()" />
  <span>{{ task().title }}</span>
</label>
<button type="button" class="delete" [attr.aria-label]="deleteLabel()" (click)="remove.emit()">
  ×
</button>
```

An Angular component always renders into a *host element*. With an element selector such as
`app-task-item`, the DOM would be `<ul><app-task-item><li>…`, and a custom element between `<ul>` and `<li>`
breaks the list's semantics. The attribute selector `li[app-task-item]` makes the `<li>` itself the host, and
the `host` metadata adds the `task` class and binds `done` to the task's state.

`input.required<Task>()` declares a signal input: the parent's `[task]="task"` sets it, and reading
`task()` in the template tracks it. `output()` declares an event the parent listens to with `(toggle)`.
Neither the item nor its parent needs to know how a toggle is stored.

### `task-form.ts` and `task-form.html`

```ts
import { Component, output, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

@Component({
  imports: [FormField, FormRoot],
  selector: 'app-task-form',
  templateUrl: './task-form.html',
})
export class TaskForm {
  readonly add = output<string>();

  private readonly title = signal('');

  // A Signal Form whose model is the title string. [formField] binds it to the
  // input both ways (and sets name="title"); [formRoot] cancels the browser's
  // submit and runs the action.
  protected readonly titleField = form(this.title, {
    name: 'title',
    submission: {
      action: async () => {
        const title = this.title().trim();
        if (title === '') return;
        this.add.emit(title);
        this.title.set('');
      },
    },
  });
}
```

```html
<form aria-label="Add task" class="add" [formRoot]="titleField">
  <label for="new-task">New task</label>
  <input id="new-task" autocomplete="off" [formField]="titleField" />
  <button type="submit">Add</button>
</form>
```

Angular has three forms systems. Template-driven forms (`ngModel`) and reactive forms (`FormGroup`,
`FormControl`, Observables of value changes) have existed since Angular 2. **Signal Forms**, stable since
v22, model a form as a signal of plain data: `form(model)` returns a tree of fields that mirrors the model's
shape, and `[formField]` binds one field to an input in both directions. Validation rules (`required`,
`minLength`, custom ones) go in a schema function passed to `form`, and each field exposes `value()`,
`valid()`, `errors()`, `touched()` and `dirty()` as signals.

Tasklet's form is a single string, so the model is `signal('')` and the field is the form itself.
`[formRoot]` calls `preventDefault()` on submit and runs `submission.action`. The `name: 'title'` option sets
the input's `name` attribute; Angular rejects a `name` written directly on an element that has
`[formField]` (error NG8022), because the form owns it.

Signal Forms are a heavy dependency for one text box: they add about 20.8 kB gzipped to this build.
Exercise 2 replaces them with a signal and two event bindings.

### `filter-bar.ts` and `filter-bar.html`

```ts
import { Component, model } from '@angular/core';
import type { Filter } from '../tasks';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  // A model input: the parent binds it with [(filter)], and set() here
  // writes the new value back to the parent's signal.
  readonly filter = model.required<Filter>();

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
  ];
}
```

```html
<div role="group" aria-label="Filter" class="filters">
  @for (option of filters; track option.value) {
    <button
      type="button"
      [attr.aria-pressed]="option.value === filter()"
      (click)="filter.set(option.value)"
    >
      {{ option.label }}
    </button>
  }
</div>
```

`model()` is an input you can also write. The parent's `[(filter)]="filter"` passes its signal in;
`filter.set(…)` here emits a `filterChange` event that writes the new value back into the parent's signal.
This is the one place in Tasklet where two-way binding between components is the natural fit.
`[attr.aria-pressed]` sets the attribute; a boolean becomes `"true"` or `"false"`, as the contract requires.

### Unit tests

The CLI generated `app.spec.ts`, rewritten here to test Tasklet. `TestBed` creates the component with its
real injector, and `whenStable()` waits for change detection, which in a zoneless app runs on its own
schedule:

```ts
  it('toggles a task through the checkbox', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLInputElement>('li input')!.click();
    await fixture.whenStable();
    expect(element.querySelector('li')?.classList).toContain('done');
    expect(element.querySelector('p.count')?.textContent).toBe('0 tasks left');
  });
```

```console
$ npm test

> ng test --watch=false

❯ Building...
✔ Building...
Application bundle generation complete. [0.982 seconds] - 2026-11-02T15:43:04.426Z


 RUN  v5.0.5 /home/tbangma/learn-web-frameworks/tasklet/angular


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  10:43:04
   Duration  701ms (environment 53%, setup 21%, tests 10%, transform 8%, import 7%, worker 1%)
```

### Build it and run it

```console
$ cd tasklet/angular
$ npm ci
$ npm run build

> tasklet-angular@0.0.0 build
> ng build

❯ Building...
✔ Building...
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-QDZ4Y4UK.js    | main          | 237.68 kB |                66.21 kB
styles-T7SWO3BI.css | styles        |   2.31 kB |               744 bytes

                    | Initial total | 239.99 kB |                66.95 kB

Application bundle generation complete. [1.213 seconds] - 2026-11-02T15:43:59.181Z

Output location: /home/tbangma/learn-web-frameworks/tasklet/angular/dist/angular
$ node ../tools/size.mjs dist/angular/browser
file                        raw        gzip
index.html              1.21 kB     0.71 kB
main-QDZ4Y4UK.js      237.68 kB    75.31 kB
styles-T7SWO3BI.css     2.31 kB     0.94 kB
total                 241.20 kB    76.97 kB
```

The build takes about 1.6 seconds. The CLI's "estimated transfer size" uses its own compression estimate;
the course measures gzip with `size.mjs`, which gives 76.97 kB. `index.html` is bigger than the source
because the CLI inlines the critical CSS (the `:root` variables) and loads the rest of the stylesheet
without blocking rendering. Then run the acceptance test:

```console
$ cd ../e2e
$ node run-all.mjs angular
=== Angular (tasklet/angular, port 4305) ===
…
$ npm run preview &    (in /home/tbangma/learn-web-frameworks/tasklet/angular)

> tasklet-angular@0.0.0 preview
> http-server dist/angular/browser -p 4305 -c-1

Starting up http-server, serving dist/angular/browser
…
$ npx playwright test    (in /home/tbangma/learn-web-frameworks/tasklet/e2e)

Running 15 tests using 15 workers
…
  15 passed (2.0s)

Summary
app      port  build  passed  failed  skipped  note
angular  4305  ok     15      0       0
```

All 15 pass. (`http-server` logs every request; those lines are cut from the output.) The app is 263 lines of
TypeScript and HTML in `src/app/` plus `main.ts`, not counting the spec, and 76.97 kB gzipped: slightly
more than React's 70.14 kB, nearly three times Vue's 28.37 kB. Two features account for about 30 kB of
that. Replacing Signal Forms and `httpResource` with a plain signal and `fetch` (Exercises 2 and 3) brings
the same app to 46.05 kB with all tests passing. The core runtime, with its DI system, change detection
and template instructions, is still the largest of the frameworks so far.

`npm run dev` starts `ng serve` at `http://localhost:4305/` with hot module replacement for templates and
styles.

## Beyond Tasklet

### Router

`@angular/router` is configured with `provideRouter(routes)` in `app.config.ts`, the line Tasklet removed.
Routes map paths to components, and `loadComponent: () => import('./admin/admin')` code-splits a route.
Guards and resolvers are plain functions that can `inject()` services. With
`withComponentInputBinding()`, route parameters arrive as the component's signal inputs. In v22 the router's
`paramsInheritanceStrategy` defaults to `'always'`, so child routes see their parents' parameters.
[Chapter 16](16-state-routing-and-data.md) compares routers across frameworks.

### HttpClient and RxJS

`HttpClient` is more than `fetch`: functional interceptors (`withInterceptors`) add auth headers or log
errors for every request, `HttpTestingController` fakes the server in unit tests, and on the server the
transfer cache avoids fetching the same data twice during hydration. Its methods return **Observables**.

RxJS was once everywhere in Angular: HTTP, router events, form value changes and `@Input` change handling
all went through streams, and "unsubscribe in `ngOnDestroy`" was a rite of passage. Signals have taken over
*state*: a value that is always there and changes over time. RxJS remains a required peer dependency of
`@angular/core` and is still the better tool for *events over time*: debouncing a search box, canceling a
stale request with `switchMap`, merging WebSocket messages. `@angular/core/rxjs-interop` converts between the
two: `toSignal(observable)`, `toObservable(signal)`, `rxResource` (a resource whose loader returns an
Observable) and `takeUntilDestroyed()`. A reasonable rule today is signals for state and templates, RxJS
where you would otherwise write a timer or a cancellation by hand.

### Forms

Template-driven forms are quick for simple cases. Reactive forms (`FormGroup`, `FormControl`, `Validators`)
built most of the large Angular forms in production today and aren't going away. Signal Forms are the new
recommendation: the model is your own signal, validation is a schema, and every piece of field state is a
signal, which fits zoneless change detection. Since they became stable in v22, the documentation presents
them first.

### Testing, i18n and server rendering

- **Testing.** `ng test` runs unit tests with Vitest in jsdom (or a real browser through Vitest's browser
  mode). v22 includes `refactor-jasmine-vitest` and `migrate-karma-to-vitest` schematics for older projects.
  The Angular CDK's *component harnesses* let tests drive Material components through a stable API. For
  end-to-end tests the CLI has an `ng e2e` hook and leaves the choice of Playwright or Cypress to you.
- **Internationalization.** `@angular/localize` marks text with an `i18n` attribute in templates and
  `$localize` in code. `ng extract-i18n` writes the messages to XLIFF or JSON for translators, and the build
  produces one copy of the app per locale, with translations compiled in rather than looked up at runtime.
- **Server rendering.** `ng new --ssr` (or `ng add @angular/ssr`) adds server-side rendering, prerendering
  and hydration, with a render mode per route. `@defer` blocks lazy-load part of a template on a trigger
  (`on viewport`, `on interaction`) and, with incremental hydration, hydrate it only then.
  [Chapter 18](18-meta-frameworks-and-rendering.md) covers this, and **Analog**, the community
  meta-framework that adds file-based routing, server `load` functions and API routes to Angular using Vite
  and Nitro.
- **Libraries.** Angular Material (Material Design components), the CDK (overlays, drag and drop, virtual
  scrolling, accessibility utilities) and Angular Aria (headless accessible components, stable in v22) are
  maintained by the Angular team.

### Releases and long-term support

Angular publishes its schedule and support policy. Until v22, a new major version came every six months;
from v22 the cadence is one major a year with four to six minor releases, and each major is supported for
24 months: 12 months of active support, then 12 months of long-term support (LTS) with critical and
security fixes only.

| Version | Released | Active ends | LTS ends |
| --- | --- | --- | --- |
| 22 | 2026-06-03 | 2027-06 | 2028-06 |
| 21 | 2025-11-19 | 2026-06-03 | 2027-06 |
| 20 | 2025-05-28 | 2025-11-19 | 2026-11-28 |

Breaking changes happen only in majors, a deprecated API survives at least one more major, and `ng update`
runs code migrations for you (in v22, one adds `ChangeDetectionStrategy.Eager` to components that relied on
the old default). Upgrading one major at a time on schedule is routine work; skipping several is not.

## Strengths and trade-offs

**Strengths**

- **One platform.** Router, forms, HTTP, i18n, SSR, testing and the CLI come from one team, are versioned
  together and are documented in one place. Two Angular codebases look much more alike than two React
  codebases.
- **Built for large teams.** Strong typing everywhere, type-checked templates, DI for testability and
  generated code that follows one style guide.
- **Predictable change.** A published release schedule, long support windows and automated migrations
  through `ng update`.
- **A modern core.** Signals, zoneless change detection and the new control flow make today's Angular much
  lighter to write than the Angular of 2016–2022, and `resource`/`httpResource` handle async state without
  extra libraries.
- **Long-term backing.** Google builds many of its own products on Angular and employs the team.

**Trade-offs**

- **The largest bundle in the course so far.** 76.97 kB gzipped for Tasklet, about 46 kB without Signal
  Forms and HttpClient. That matters little for a large internal app and a lot for a small public page.
- **Concepts to learn.** Decorators, DI and injection contexts, inputs and outputs, `model`, host
  bindings, two forms APIs and RxJS, before you are productive.
- **Two Angulars.** Most existing code uses NgModules, Zone.js, `*ngIf` and Observables; new code uses
  standalone components, signals and `@if`. You will need to read both for years.
- **Tooling lag.** No TypeScript 7 until the new compiler ships; the decorators are TypeScript's legacy
  ones.
- **Ceremony for small things.** One component is two or three files and a decorator; Tasklet's 263 lines
  are the most in the course so far.

## Compared with React and Vue

The **store**: React keeps state in `App` and passes callbacks down; Angular puts it in an injectable
service. Here is the toggle in each, from `tasklet/react/src/App.tsx` and `tasklet/angular/src/app/task-store.ts`:

```tsx
  function handleToggle(id: string) {
    setTasks((current) => current && current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }
```

```ts
  toggle(id: string): void {
    this.tasks.update(
      (tasks) =>
        tasks && tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }
```

The update itself is identical: both need a new array so that the change is noticed. The difference is
what happens next. React re-runs `App` and, because `TaskItem` isn't memoized, every `TaskItem`, then diffs the virtual DOM.
Angular marks the views that read `tasks()` (and their ancestors) dirty and runs their update passes; `@for`
with `track` keeps the other rows' DOM and refreshes their bindings, which still hold the same values.

The **fetch**: React's version needs two `useState` calls and a `useEffect` with an `ignore` flag. Angular's
`httpResource` gives loading, error, value and reload as signals in four lines. Vue's version is closer to
React's, a `ref` and an async function called from `onMounted`.

The **list item**: React's `TaskItem` is a function returning JSX with `className={task.done ? 'task done' :
'task'}`. Angular's is a class, a template file and a `host` binding (`'[class.done]': 'task().done'`), with
an attribute selector so that the component *is* the `<li>`. Vue sits in between: a single-file component
with `:class="['task', { done: task.done }]"`.

The **mental model**: React re-renders components and diffs; Vue tracks dependencies per component and
diffs; Angular tracks dependencies per component and refreshes compiled bindings without a virtual DOM. All
three treat the component as the unit of update. The next chapter's framework, Solid, doesn't.
[Appendix A](appendix-a-rosetta-stone.md) lines up the syntax of every framework in the course, and
[Chapter 15](15-reactivity-compared.md) compares their reactivity models.

## Summary

- Angular is a complete platform from Google: components, DI, router, forms, HttpClient, i18n, SSR, the
  CLI and the test setup, released together, with a major version every year and 24 months of support.
- Components are TypeScript classes with a `@Component` decorator and an HTML template. The compiler turns
  each template into a creation pass and an update pass of DOM instructions.
- Signals (`signal`, `computed`, `effect`, `linkedSignal`, `input`, `output`, `model`) drive change
  detection. New apps have been zoneless since v21, and components are `OnPush` by default since v22, so a
  view refreshes when a signal it reads changes or one of its template event handlers runs.
- `@if`, `@for … track` and `@empty` replace the old structural directives.
- Services hold shared state and are injected with `inject()`; `@Service()` provides one at the root.
- `httpResource` and `resource` expose async work as signals; Signal Forms model a form as a signal; both
  became stable in v22. RxJS remains for event streams and interop.
- Tasklet in Angular is 263 lines, 76.97 kB gzipped (46.05 kB without Signal Forms and HttpClient), and
  passes all 15 tests.

## Exercises

1. **Zoneless in practice.** Add an uptime line to `App`: a plain number field incremented by
   `setInterval`, shown as `<p class="uptime">Open for {{ seconds }} s</p>`. Before you run it, predict what
   the line shows at load, after 3.5 seconds, and after you click the Active filter. The variant is in
   `examples/ch07/exercises/uptime-field/`; run it with
   `PROBE=probe-uptime.cjs ./check.sh uptime-field` from `examples/ch07/exercises`. Then make `seconds` a
   signal and run it again.

   <details><summary>Solution</summary>

   ```console
   $ PROBE=probe-uptime.cjs ./check.sh uptime-field
   …
     15 passed (2.0s)
   at load:           Open for 0 s
   after 3.5 s:       Open for 0 s
   after a click:     Open for 3 s
   ```

   The field changes every second, but nothing tells Angular. Without Zone.js, a timer callback doesn't
   trigger change detection, and in v22 the component is `OnPush` anyway. The click marks the filter bar and
   its ancestors, including `App`, dirty, so the next refresh picks up whatever the field holds at that
   moment. With Zone.js, the line would have updated every second. The fix is a signal
   (`examples/ch07/exercises/uptime-signal/src/app/app.ts`):

   ```ts
     protected readonly seconds = signal(0);
   ```

   ```ts
     constructor() {
       setInterval(() => this.seconds.update((s) => s + 1), 1000);
     }
   ```

   with `{{ seconds() }}` in the template. Now the template depends on the signal and each tick schedules
   a refresh:

   ```console
   at load:           Open for 0 s
   after 3.5 s:       Open for 3 s
   after a click:     Open for 3 s
   ```

   </details>

2. **Forms without Signal Forms.** Rewrite `TaskForm` with a plain `signal('')`, a `(submit)` handler and
   `[value]`/`(input)` bindings, with no import from `@angular/forms`. Check that the tests still pass and
   measure the size.

   <details><summary>Solution</summary>

   `examples/ch07/exercises/plain-form/src/app/task-form/task-form.ts`:

   ```ts
   import { Component, output, signal } from '@angular/core';

   @Component({
     selector: 'app-task-form',
     templateUrl: './task-form.html',
   })
   export class TaskForm {
     readonly add = output<string>();

     protected readonly title = signal('');

     protected submit(event: SubmitEvent): void {
       event.preventDefault();
       const title = this.title().trim();
       if (title === '') return;
       this.add.emit(title);
       this.title.set('');
     }
   }
   ```

   `examples/ch07/exercises/plain-form/src/app/task-form/task-form.html`:

   ```html
   <form aria-label="Add task" class="add" (submit)="submit($event)">
     <label for="new-task">New task</label>
     <input
       id="new-task"
       name="title"
       autocomplete="off"
       [value]="title()"
       (input)="title.set($any($event.target).value)"
     />
     <button type="submit">Add</button>
   </form>
   ```

   `$any()` casts `$event.target` (an `EventTarget`) so the template type checker accepts `.value`. After
   `title.set('')`, the `[value]` binding writes the empty string back to the input.

   ```console
   $ ./check.sh plain-form
   …
     15 passed (1.8s)
   total                 168.05 kB    56.18 kB
   ```

   All 15 pass, and the build drops from 76.97 to 56.18 kB gzipped. Signal Forms earn their size when you
   have validation, nested fields and error messages, not for a single text box.

   </details>

3. **`resource` with `fetch`.** Replace `httpResource` in `TaskStore` with the generic `resource()` and
   the browser's `fetch`. Keep the same signals (`tasks`, `loading`, `failed`) and `retry`. What does the
   loader need to handle that `httpResource` handled for you?

   <details><summary>Solution</summary>

   The changed part of `examples/ch07/exercises/resource-fetch/src/app/task-store.ts`:

   ```ts
     // Load ./tasks.json with fetch only when nothing valid was saved. Returning
     // undefined from params keeps the resource idle.
     private readonly seed = resource({
       params: () => (this.saved ? undefined : './tasks.json'),
       loader: async ({ params: url, abortSignal }) => {
         const response = await fetch(url, { signal: abortSignal });
         if (!response.ok) throw new Error(`HTTP ${response.status}`);
         return parseTaskList(await response.json());
       },
     });
   ```

   The loader must check `response.ok` itself, because `fetch` resolves for a 500, and it should pass the
   `abortSignal` along so that a superseded request is canceled. `params` plays the role of the URL
   function: `undefined` keeps the resource idle. Everything else in the store stays the same.

   ```console
   $ ./check.sh resource-fetch
   …
     15 passed (1.9s)
   total                 215.07 kB    68.24 kB
   ```

   That saves 8.7 kB, the size of HttpClient. With both changes (`examples/ch07/exercises/both/`) the app
   is 136.85 kB raw and 46.05 kB gzipped and passes all 15 tests. You give up interceptors and the
   HttpClient testing tools, which Tasklet doesn't use.

   </details>

4. **`@empty`.** `@for` has an `@empty` block. Rewrite the list part of `app.html` to use it instead of the
   inner `@if`/`@else`, with `<li class="empty">Nothing to show.</li>` in the block. Which test do you
   expect to fail, and why?

   <details><summary>Solution</summary>

   `examples/ch07/exercises/empty-block/src/app/app.html` replaces the inner `@if` with:

   ```html
       <ul class="tasks" aria-label="Tasks">
         @for (task of visible(); track task.id) {
           <li
             app-task-item
             [task]="task"
             (toggle)="store.toggle(task.id)"
             (remove)="store.remove(task.id)"
           ></li>
         } @empty {
           <li class="empty">Nothing to show.</li>
         }
       </ul>
   ```

   ```console
   $ ./check.sh empty-block
   …
       Error: expect(locator).toBeHidden() failed
   …
       Expected: hidden
       Received: visible
   …
     1 failed
       [chromium] › tests/tasklet.spec.ts:295:1 › shows "Nothing to show." when no task matches the filter
     14 passed (6.2s)
   ```

   The message is found and has the `empty` class, but the test then expects the list itself to be hidden
   (line 302 of the spec). `@empty` renders inside the `@for`'s parent, so the `<ul aria-label="Tasks">`
   is still there with one item that isn't a task. The contract asks for the paragraph *instead of* the
   list, which is a different structure, so Tasklet uses `@if`. `@empty` is the right choice when the
   empty state belongs inside the container, for example a table row reading "No results".

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-7--angular)
