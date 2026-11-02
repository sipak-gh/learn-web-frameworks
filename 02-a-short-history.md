# Chapter 2 — A Short History

Every framework in this course is an answer to a question someone was asking at the time. jQuery answered
"how do I make this work in every browser?" Backbone answered "where should my data live?" React answered
"why is keeping the page in sync with my data so hard?" htmx answers "why did all this move to the browser in
the first place?" The questions repeat, the answers swing back and forth between the server and the browser,
and ideas that looked new in 2023 often turn out to have been tried in 2010. Knowing that story makes the
current landscape much easier to read: you stop seeing a pile of competing brands and start seeing a handful
of design choices, each with a history of why it was made.

This chapter is that story, from DHTML and jQuery to signals and the return to the server. It is told in
eras, and five of them come with the same tiny program written the way that era wrote it: a text box, an Add
button, a list and an "N items" line. You can open each one in a browser and compare. The chapter ends with a
timeline and a look at Ember, the framework from 2011 that is still shipping releases every six weeks.
[Chapter 3](03-the-problem-frameworks-solve.md) then builds the course's reference app, Tasklet, with no
framework at all, so you can feel the problem every framework here is trying to solve.

## Running the examples

The examples live in `examples/ch02/`. Each is a single HTML file that loads one library from
`node_modules/` with a plain `<script>` tag, the way these libraries were used when they were new. The
versions are pinned in `package.json`:

`examples/ch02/package.json`
```json
{
  "name": "ch02-history-examples",
  "private": true,
  "description": "The same tiny list in jQuery, Backbone, Knockout, AngularJS and React (createClass and hooks)",
  "scripts": {
    "build": "esbuild react-15.jsx --outfile=build/react-15.js && esbuild react-19.jsx --bundle --minify --jsx=automatic --define:process.env.NODE_ENV='\"production\"' --outfile=build/react-19.js"
  },
  "dependencies": {
    "angular": "1.8.3",
    "backbone": "1.6.1",
    "jquery": "4.0.0",
    "knockout": "3.5.3",
    "react": "19.3.1",
    "react-15": "npm:react@15.4.2",
    "react-dom": "19.3.1",
    "react-dom-15": "npm:react-dom@15.4.2",
    "underscore": "1.13.8"
  },
  "devDependencies": {
    "esbuild": "0.28.2"
  }
}
```

A few things in there need explaining:

- **jQuery 4.0.0, Backbone 1.6.1, Knockout 3.5.3.** These are the current releases. All three are still
  maintained, so there was no reason to pick an old version: the code style is old, the libraries are not.
- **AngularJS 1.8.3** is the final release. Its changelog names it `ultimate-farewell`, and support ended in
  January 2022.
- **React 15.4.2** is installed under the alias `react-15` (the `npm:` prefix installs one package under
  another name), next to the current React 19.3.1. React 15 is the last line that shipped `React.createClass`
  in the core package without a deprecation warning, so it shows the original style honestly.

`react-dom@15` wants `react@15` as a peer dependency, which clashes with React 19 in the same folder. A
one-line `.npmrc` tells npm to accept that:

`examples/ch02/.npmrc`
```text
# react-dom@15 wants react@15 as a peer; this folder also has react@19 for the modern example.
legacy-peer-deps=true
```

Install and build:

```console
$ npm ci
$ npm run build

> build
> esbuild react-15.jsx --outfile=build/react-15.js && esbuild react-19.jsx --bundle --minify --jsx=automatic --define:process.env.NODE_ENV='"production"' --outfile=build/react-19.js


  build/react-15.js  1.1kb

⚡ Done in 2ms

  build/react-19.js  218.8kb

⚡ Done in 27ms
```

Then open any of the `.html` files directly in a browser. No server is needed: they work from `file://`.
Only the two React pages need the build step, because JSX is not JavaScript and has to be compiled first.

The examples are plain JavaScript in the style of their time (`var`, `function`, no modules) rather than the
TypeScript the rest of the course uses. Most of these libraries predate TypeScript's popularity, and writing
them in modern syntax would hide exactly what this chapter wants you to see. `npm audit` will report
high-severity advisories in this folder: AngularJS has known issues that will never be fixed because it is
end-of-life, and React 15 depends on an old `node-fetch` that its browser builds never load. That is fine for
a history exhibit and a good reason not to start a new project on either.

Every page was checked in headless Chromium with Playwright: type an item, press Add, see it in the list and
the count change; an empty submission is ignored, and HTML typed into the box is shown as text, not run.

## Before frameworks: DHTML, Ajax and jQuery (1995–2009)

JavaScript arrived in Netscape Navigator in 1995, and for its first decade it mostly decorated pages that
servers had built. "Dynamic HTML" (DHTML) was the late-1990s name for scripts that moved, showed and hid
elements after the page loaded. Every browser exposed a different object model, and much of the code was
`if (document.all) { … } else if (document.layers) { … }` branches for Internet Explorer and Netscape.

Two things changed the role of JavaScript. The first was a way to talk to the server without reloading:
Microsoft shipped an `XMLHTTP` object (as ActiveX) in Internet Explorer 5 in 1999, built for Outlook Web
Access, and other browsers copied it as `XMLHttpRequest`. The second was a name. On February 18, 2005, Jesse James Garrett
published "Ajax: A New Approach to Web Applications", pointing at Google Suggest and Google Maps as examples
of pages that updated in place and felt like desktop software. The technique was not new; the name made it
something you could ask for.

The libraries that followed (Prototype, Dojo, MooTools, YUI and others) smoothed over browser differences
and added widgets. The one that won was jQuery. John Resig introduced it at BarCamp NYC in January 2006 and
released 1.0 on August 26, 2006. Its idea fits in one line: select elements with a CSS selector, then do
something to all of them, with a chained API that hid browser quirks.

Here is the tiny list in jQuery:

`examples/ch02/jquery.html`
```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>jQuery: a list</title>
<form id="add">
  <input id="title" aria-label="New item">
  <button>Add</button>
</form>
<ul id="items"></ul>
<p id="count">0 items</p>
<script src="node_modules/jquery/dist/jquery.min.js"></script>
<script>
  $(function () {
    var count = 0; // the state lives here and in the DOM; you keep them in sync

    $('#add').on('submit', function (event) {
      event.preventDefault();
      var title = $('#title').val().trim();
      if (!title) return;
      $('<li>').text(title).appendTo('#items');
      count += 1;
      $('#count').text(count + (count === 1 ? ' item' : ' items'));
      $('#title').val('');
    });
  });
</script>
```

It reads well, and for a page with a few interactions it is still a perfectly good way to work. Notice where
the state lives, though. The list of items exists only in the DOM (the `<li>` elements themselves). The count
lives in a variable *and* in the text of `#count`, and the code keeps them in step by hand. Every feature you
add (remove an item, edit one, filter, sort, load from the server) is another place that must update every
piece of the DOM that depends on the change. Exercise 2 asks you to add a Remove button, and you will see the
problem appear immediately.

This is the problem the rest of the chapter is about: **keeping the UI in sync with the data**. jQuery gives
you an excellent tool for changing the DOM and no opinion at all about *when* or *what* to change.

jQuery is far from gone. jQuery 4.0.0 shipped on January 17, 2026, the first major release in almost ten
years; it drops support for old browsers and removes long-deprecated helpers such as `$.trim` (the examples
use `String.prototype.trim` instead). W3Techs reported in November 2026 that jQuery runs on about 64% of all
websites, and on 85% of the sites whose JavaScript library it can identify. Most of that is WordPress themes
and older sites, but it means jQuery is still, by a wide margin, the most deployed JavaScript library on the
web.

## The MV* years: Backbone, Knockout, AngularJS, Ember (2010–2013)

By 2010 browsers had become fast (Chrome's V8 engine arrived in 2008 and started a speed race) and teams were
building whole applications in a single page, in the style of Gmail. A single page with hundreds of
interactions made the jQuery approach collapse under its own weight, and within about a year several projects
offered structure borrowed from desktop GUI patterns: Model-View-Controller (MVC), Model-View-ViewModel
(MVVM), and variations that were loosely called "MV*". Four of them shaped everything after.

### Backbone (October 2010): structure and events

Jeremy Ashkenas released Backbone.js 0.1.0 on October 13, 2010, extracted from his work at DocumentCloud.
Backbone is small and deliberately unopinionated. It gives you **models** (objects that hold data and emit
`change` events), **collections** (ordered lists of models that emit `add` and `remove`), **views** (objects
that own a DOM element and listen for events) and a **router** for URL fragments. Templates come from
Underscore, Ashkenas's utility library.

`examples/ch02/backbone.html`
```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Backbone: a list</title>
<div id="app">
  <form>
    <input aria-label="New item">
    <button>Add</button>
  </form>
  <ul></ul>
  <p></p>
</div>
<script src="node_modules/jquery/dist/jquery.min.js"></script>
<script src="node_modules/underscore/underscore-umd-min.js"></script>
<script src="node_modules/backbone/backbone-min.js"></script>
<script>
  var Item = Backbone.Model.extend({ defaults: { title: '' } });
  var Items = Backbone.Collection.extend({ model: Item });

  var ListView = Backbone.View.extend({
    events: { 'submit form': 'add' },
    itemTemplate: _.template('<li><%- title %></li>'),

    initialize: function () {
      this.listenTo(this.collection, 'add', this.render); // model events drive the view
      this.render();
    },

    add: function (event) {
      event.preventDefault();
      var input = this.$('input');
      var title = input.val().trim();
      if (!title) return;
      this.collection.add({ title: title });
      input.val('');
    },

    render: function () {
      var n = this.collection.length;
      this.$('ul').html(this.collection.map(function (item) {
        return this.itemTemplate(item.toJSON());
      }, this).join(''));
      this.$('p').text(n + (n === 1 ? ' item' : ' items'));
      return this;
    }
  });

  new ListView({ el: '#app', collection: new Items() });
</script>
```

The important line is `this.listenTo(this.collection, 'add', this.render)`. The data now lives in one place,
the collection, and the view *subscribes* to it. Whoever adds an item (a form, a server response, another
view) does not need to know which parts of the page care. That separation was a large step forward.

The cost shows in `render`. Backbone has no idea what changed in the DOM, so the simple approach is what this
view does: rebuild the list's HTML from scratch. That is fine for ten items and noticeably slow for a
thousand, and it throws away focus and scroll position inside the list. Real Backbone apps added code for
"render just this one item", which brought back the hand-written synchronization the framework was meant to
remove. Large apps also discovered that events flowing between dozens of models and views were hard to trace:
a change could trigger a handler that changed another model that triggered another handler.

Backbone still exists, quietly. 1.0.0 came in March 2013, 1.6.0 in February 2024 and 1.6.1 in April 2025.

### Knockout (July 2010): observables and automatic dependency tracking

Three months earlier, on July 5, 2010, Steve Sanderson introduced Knockout, an MVVM library. Instead of
events you subscribe to by hand, Knockout has **observables**: values wrapped in functions. You read one by
calling it (`self.title()`) and write by calling it with an argument (`self.title('')`). The page declares
what it shows with `data-bind` attributes.

`examples/ch02/knockout.html`
```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Knockout: a list</title>
<form data-bind="submit: add">
  <input aria-label="New item" data-bind="textInput: title">
  <button>Add</button>
</form>
<ul data-bind="foreach: items">
  <li data-bind="text: $data"></li>
</ul>
<p data-bind="text: countText"></p>
<script src="node_modules/knockout/build/output/knockout-latest.js"></script>
<script>
  function ListViewModel() {
    var self = this;
    self.title = ko.observable('');
    self.items = ko.observableArray([]);
    self.countText = ko.computed(function () { // reruns when items changes
      var n = self.items().length;
      return n + (n === 1 ? ' item' : ' items');
    });
    self.add = function () {
      var title = self.title().trim();
      if (!title) return;
      self.items.push(title);
      self.title('');
    };
  }

  ko.applyBindings(new ListViewModel());
</script>
```

Look at `countText`. It is a `ko.computed`: a function whose result Knockout caches, and which Knockout reruns
when `items` changes. Nothing in the code says "`countText` depends on `items`". Knockout found out by
watching which observables the function read the last time it ran. Sanderson's announcement called this
"automatic dependency tracking", and it is the idea that, fifteen years later, the whole industry would call
**signals** (the TC39 Signals proposal itself names Knockout as the first popular library to use it). The
bindings in the HTML work the same way: `text: countText` is a tiny computation that updates exactly one text
node when its inputs change. No list is rebuilt and no event wiring is written by hand.

Knockout's weak points were the ones every early observable system had. Wrapping values in functions is easy
to forget (`self.items.length` is 0, the wrapper function's parameter count, while `self.items().length` is
the array's length), and a large graph of observables
and manual subscriptions could become as hard to follow as Backbone's events. Knockout is also still
maintained: after a quiet period from 2019, 3.5.2 and 3.5.3 were released in March 2026.

### AngularJS (October 2010): two-way binding and dirty checking

AngularJS came from Miško Hevery and Adam Abrons and was developed at Google. Version 0.9.0 shipped on
October 20, 2010 and 1.0 on June 13, 2012. It was the most ambitious of the four: a whole framework with
templates, **directives** (custom HTML attributes and elements), **dependency injection**, services, a router
and a test runner.

`examples/ch02/angularjs.html`
```html
<!doctype html>
<html lang="en" ng-app="demo">
<meta charset="utf-8">
<title>AngularJS: a list</title>
<div ng-controller="ListController">
  <form ng-submit="add()">
    <input aria-label="New item" ng-model="title">
    <button>Add</button>
  </form>
  <ul>
    <li ng-repeat="item in items track by $index">{{item}}</li>
  </ul>
  <p>{{items.length}} {{items.length === 1 ? 'item' : 'items'}}</p>
</div>
<script src="node_modules/angular/angular.min.js"></script>
<script>
  angular.module('demo', []).controller('ListController', function ($scope) {
    $scope.title = '';
    $scope.items = [];
    $scope.add = function () { // after this runs, a digest re-checks every {{binding}}
      var title = $scope.title.trim();
      if (!title) return;
      $scope.items.push(title);
      $scope.title = '';
    };
  });
</script>
```

There is no DOM code at all. `ng-model="title"` binds the input to `$scope.title` in both directions,
`ng-repeat` stamps out the list, and `{{items.length}}` is just an expression. The controller only changes
plain JavaScript arrays and strings. To many developers in 2012 this felt like the future, and for a while
AngularJS was the default choice for new single-page apps.

How does AngularJS know that `$scope.items` changed when it is an ordinary array? It doesn't, until it looks.
After every event it handles (a click, a keystroke, a response from its `$http` service) AngularJS runs a
**digest cycle**: it re-evaluates every watched expression on the page and compares each result with the
previous one. If anything changed, it updates that part of the DOM and runs the whole loop again, because a
change might have caused another change, up to ten rounds before giving up with an error. This is called
**dirty checking**. It works with plain objects, which is why the code is so clean, but its cost grows with
the number of bindings on the page, and code that changes data outside AngularJS (a `setTimeout`, a
third-party library) must remember to call `$scope.$apply()` or the page silently goes stale. Two-way
binding also made it hard to answer "what changed this value?" in a large app.

Google answered those problems with a rewrite rather than an upgrade (see "Angular 2" below). AngularJS 1.8.3
was released on April 7, 2022 with the codename `ultimate-farewell`, and the AngularJS site states that
support officially ended in January 2022.

### Ember (December 2011): conventions and a router-first app

Ember began as SproutCore 2.0, briefly became Amber.js, and was renamed Ember.js on December 12, 2011; Yehuda
Katz and Tom Dale led it. Ember 1.0 shipped on August 31, 2013. Where Backbone left every decision to you,
Ember made them for you: **convention over configuration**, in the spirit of Ruby on Rails. The URL and the
router were the center of an Ember app, each route loaded its model and rendered a template, and naming
conventions decided which file did what. Ember also invested early in tooling: its command-line tool
(Ember CLI) generated projects, ran builds and tests, and influenced the CLIs every framework now ships.
This chapter has no Ember snippet in the old style, because Ember is not history; its current form is at
the end of the chapter.

### What the MV* era learned

By 2013 thousands of teams had built single-page apps with these four, and TodoMVC (todomvc.com) had
collected the same to-do app written in each of them so you could compare, which is the same idea as this
course's Tasklet. Three lessons came out of that period:

1. **Declarative templates win.** Saying "this text shows `countText`" is easier to read and harder to get
   wrong than code that sets `textContent` at the right moments. Knockout, AngularJS and Ember all had them.
2. **Change detection is the hard part.** Events (Backbone), observables (Knockout) and dirty checking
   (AngularJS) were three different answers to "how do you know what to update?", and each had a cost:
   manual wiring, wrapped values, or checking everything.
3. **Data that flows both ways is hard to debug at scale.** When a template could write to the model and the
   model could update another template, finding the cause of a bug meant following arrows in both
   directions.

## React and the virtual DOM (2013)

React was created by Jordan Walke at Facebook and released as open source in May 2013 (the "initial public
release" commit is dated May 29). It took the lessons above and made a choice that sounded wrong to many at
the time: **don't track changes at all**. Instead, describe the whole UI as a function of the current state,
and when the state changes, call the function again.

Calling the function again cannot mean rebuilding the real DOM, which would be slow and would lose focus and
scroll position (Backbone's problem). So React's `render` returns a plain JavaScript description of the DOM
it wants, a tree of lightweight objects later nicknamed the **virtual DOM**. React compares the new tree
with the previous one and applies only the differences to the real DOM. Pete Hunt explained it in "Why did we
build React?", a week after the release:

> The data returned from `render` is neither a string nor a DOM node — it's a lightweight description of what
> the DOM should look like.
>
> — Pete Hunt, "Why did we build React?" (2013)

The same post described Instagram's web app as a single-page app built entirely with React. Data flows one
way: state lives in a component, goes down to children as **props**, and changes only through `setState`.
There is no two-way binding to trace.

The other surprise was **JSX**, HTML-like syntax written inside JavaScript. In 2013 the accepted practice was
to keep templates and logic in separate files, and many developers' first reaction to JSX was that it
mixed concerns. Hunt's talk at JSConf EU that year, "Rethinking Best Practices", argued that a template and
the logic that drives it are one concern, and that splitting them by technology rather than by component was
the real separation problem. Components that hold their own markup, logic and (later) styles are now the
norm in almost every framework in this course.

Here is the tiny list in the style React used until 2017, with `React.createClass`:

`examples/ch02/react-15.jsx`
```jsx
var List = React.createClass({
  getInitialState: function () {
    return { items: [], title: '' };
  },

  handleChange: function (event) {
    this.setState({ title: event.target.value });
  },

  handleSubmit: function (event) {
    event.preventDefault();
    var title = this.state.title.trim();
    if (!title) return;
    this.setState({ items: this.state.items.concat([title]), title: '' });
  },

  render: function () { // describe the whole UI; React works out the DOM changes
    var n = this.state.items.length;
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <input aria-label="New item" value={this.state.title} onChange={this.handleChange} />
          <button>Add</button>
        </form>
        <ul>
          {this.state.items.map(function (item, i) {
            return <li key={i}>{item}</li>;
          })}
        </ul>
        <p>{n + (n === 1 ? ' item' : ' items')}</p>
      </div>
    );
  }
});

ReactDOM.render(<List />, document.getElementById('app'));
```

`examples/ch02/react-15.html`
```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>React 15 (createClass): a list</title>
<div id="app"></div>
<script src="node_modules/react-15/dist/react.min.js"></script>
<script src="node_modules/react-dom-15/dist/react-dom.min.js"></script>
<script src="build/react-15.js"></script>
```

Compare it with AngularJS. The code changes data with `setState` and never touches the DOM, like AngularJS,
but the template is ordinary JavaScript (`map` instead of `ng-repeat`), and React does not need to watch
anything: `setState` *is* the notification. The input is a **controlled component**: its value comes from
state, and every keystroke goes through `handleChange`. That is more code than `ng-model`, and it is the
price of one-way data flow.

React's API then changed shape twice. React 0.13 (March 2015) added support for ES6 classes
(`class List extends React.Component`). React 15.5.0 (April 2017) deprecated `createClass`, and React 16.0
(September 2017) removed it from the core package. React 16.8 (February 2019) introduced **hooks**, which
let plain functions hold state and run effects. The same app with today's React:

`examples/ch02/react-19.jsx`
```jsx
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function List() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setItems([...items, { id: crypto.randomUUID(), title: trimmed }]);
    setTitle('');
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input aria-label="New item" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button>Add</button>
      </form>
      <ul>
        {items.map((item) => <li key={item.id}>{item.title}</li>)}
      </ul>
      <p>{items.length + (items.length === 1 ? ' item' : ' items')}</p>
    </>
  );
}

createRoot(document.getElementById('app')).render(<List />);
```

The model is unchanged since 2013: state goes in, a description of the UI comes out, and React reconciles.
What changed is the packaging (functions and hooks instead of classes and lifecycle methods), the size of the
ecosystem around it (Flux in 2014 and Redux in 2015 for shared state, React Native for mobile, Next.js for
the server), and later the React Compiler (1.0 in October 2025), which adds memoization automatically so
that "re-render everything" does less work. The keys changed too: the 2015 version keys list items by their
index, which works only because this list never reorders; the modern one gives each item a stable id.
[Chapter 4](04-react.md) covers React's model, and [the React course](../learn-react/README.md) teaches it in
depth.

The virtual DOM spread quickly. Preact (2015) reimplemented React's API in a few kilobytes, Inferno chased raw
speed, and Vue 2 adopted a virtual DOM in 2016. For the rest of the decade "component + virtual DOM" was
what most people meant by a modern framework.

## Vue (2014): the approachable middle

Evan You launched Vue.js in February 2014, describing it in his launch post as "a library for building web
interfaces using MVVM data bindings with a very simple API". Vue took the parts of AngularJS that people
liked (HTML templates with directives such as `v-for` and `v-model`, two-way binding for forms) and paired
them with Knockout-style dependency tracking instead of dirty checking: Vue converted your data into
reactive getters and setters, so it knew which component depended on which property.

Vue 1.0 came on October 27, 2015 and Vue 2.0 on September 30, 2016. Version 2 added a virtual DOM under the
template layer, so Vue combined dependency tracking (to know *which component* to re-render) with diffing
(to update *that component's* DOM). Vue 3.0 (September 18, 2020) rewrote the reactivity system on top of
JavaScript `Proxy` objects and added the **Composition API** (`ref`, `computed`, `watch`) alongside the
original Options API. Single-file components (`.vue` files with `<template>`, `<script>` and `<style>`) have
been Vue's signature since the start.

Vue has never had a large company behind it. It is funded by sponsors and
community donations and maintained by a core team led by You. Its current stable release is 3.5, and 3.6 is
in release-candidate stage with **Vapor mode**, an opt-in compilation mode that skips the virtual DOM and
updates the DOM directly from signals (its reactivity core was rebuilt on the alien-signals library).
[Chapter 5](05-vue.md) covers Vue in full.

## Angular 2 (2016): the rewrite

The AngularJS team's answer to dirty checking and two-way binding was a new framework. Announced in 2014 and
released as Angular 2.0.0 on September 14, 2016, it kept the name and the ambitions (dependency injection,
templates with directives, a full platform) but almost nothing of the code. It was written in TypeScript, used
classes with decorators for components and services, used RxJS observables for asynchronous work, and
detected changes with **Zone.js**, a library that patches browser APIs such as `setTimeout` and event
listeners so Angular knows when any asynchronous task finishes and can check the component tree. There was
no automatic upgrade path from AngularJS. Many teams felt abandoned, and some moved to React or Vue
instead; others stayed and found Angular well suited to large codebases. To separate the two, the old
framework is "AngularJS" and the new one is just "Angular".

Angular then settled into a predictable rhythm of a major version every six months, and its recent history
is one of steady change inside a stable platform. Angular 16 (May 2023) introduced **signals**. Angular 17
(November 2023) added built-in control flow (`@if`, `@for`) and moved documentation to angular.dev. From
Angular 21 (November 2025), new apps are **zoneless** by default: change detection is driven by signals and
explicit notifications instead of Zone.js. The current major is 22 (June 2026). [Chapter 7](07-angular.md)
covers Angular today.

## Compilers: Svelte and the disappearing framework (2016–2019)

On November 26, 2016 Rich Harris published "Frameworks without the framework", introducing Svelte. The
argument: a framework's runtime is code every user downloads to interpret your components at run time. If a
**compiler** reads your components at build time instead, it can generate the exact DOM operations each one
needs, and ship little or no framework code.

Svelte 3 (April 22, 2019) made the idea feel natural. Its launch post, "Svelte 3: Rethinking reactivity",
made state simply variables: assign to a `let` and the compiler inserts the code to update the DOM.

> So we took a step back and asked ourselves what kind of API would work for us... and realised that the
> best API is no API at all. We can just _use the language_.
>
> — Rich Harris, "Svelte 3: Rethinking reactivity" (2019)

Compilation became a theme across the field rather than a single framework's trick. Marko at eBay compiled
templates for streaming server rendering; Stencil compiled components to Web Components; Angular's Ivy
renderer compiled templates to instructions; Solid compiled JSX to real DOM creation; and the React Compiler
now rewrites components to skip unnecessary work. Svelte itself changed course in version 5 (October 2024):
"runes" such as `$state`, `$derived` and `$effect` replaced the implicit `let` reactivity with explicit
signals, still compiled. [Chapter 6](06-svelte.md) covers Svelte.

## The signals era (2018–today)

The virtual DOM's trade-off is that a state change re-runs component functions and diffs their output, even
when only one text node needs to change. The alternative had existed since Knockout: track exactly which
computation read which value, and when a value changes, rerun only those computations. Through the 2010s the
idea was kept alive by smaller projects: S.js (2013) added the notion of computations *owning* the
computations created inside them and popularized the word "signal"; MobX (2015) brought it to React apps
with a push-pull algorithm that never shows half-updated values; and Vue used it under its templates.

The modern revival is usually traced to **Solid**. Ryan Carniato's library uses signals with JSX, but its
components run *once*: the JSX compiles to real DOM nodes plus small effects, one per dynamic spot, and
afterwards a state change updates only the nodes that read it, with no virtual DOM and no re-render. Solid 1.0
was released on June 28, 2021, and it has placed near the top of the js-framework-benchmark, close to
hand-written vanilla JavaScript. Its success, and Carniato's
steady writing about the approach, turned "fine-grained reactivity" from a niche into a direction.

Then nearly everyone moved:

- **Preact Signals** (September 2022) added signals to Preact and React apps.
- **Qwik** built its resumable model on signals (1.0 in May 2023).
- **Angular** introduced signals in version 16 (May 2023), and made them the basis of zoneless change
  detection.
- **Svelte 5** (October 2024) replaced compile-time `let` reactivity with signal-based runes.
- **Vue** rebuilt its reactivity core on alien-signals and is finishing Vapor mode (3.6, in release
  candidate).
- **Ember** had already moved to autotracking with `@tracked` properties, a signals system under another name.

In April 2024 a group of framework authors brought a **Signals proposal** to TC39, the committee that
evolves JavaScript, aiming at a shared primitive that frameworks could build on. It reached Stage 1, which
means the committee agrees the problem is worth exploring, and as of November 2026 it is still at Stage 1,
with a polyfill available for experiments. Carniato summed up the moment in 2023:

> Signals and the language of reactivity seem to be where things are converging.
>
> — Ryan Carniato, "The Evolution of Signals in JavaScript" (2023)

React is the notable exception. It kept its model (state in, UI description out) and invested in a compiler
to make re-rendering cheaper instead. [Chapter 15](15-reactivity-compared.md) compares the approaches in
depth and builds a small signals library from scratch; [Chapter 8](08-solid.md) and
[Chapter 9](09-preact.md) cover Solid and Preact.

## The return to the server (2020–today)

While client-side frameworks were refining reactivity, a different question was growing louder: should all
of this run in the browser at all? A single-page app sends an almost empty HTML page plus a JavaScript bundle
that fetches data and builds the page. On a fast laptop that is fine. On a mid-range phone on a slow network
it means a long blank screen, then a large script to parse and run. Server rendering came back from several
directions at once.

### Server rendering for frameworks

The first answer kept the frameworks and ran them on the server too. Next.js launched on October 25, 2016,
rendering React on the server and then **hydrating** the HTML in the browser: React re-runs the components
there, attaches event handlers, and takes over. Nuxt (Vue), SvelteKit, SolidStart, Analog (Angular) and
others followed; [Chapter 18](18-meta-frameworks-and-rendering.md) covers them. Hydration fixes the blank
screen but not the bundle: the browser still downloads and runs the code for every component on the page,
even the static ones.

### Hypermedia: intercooler.js and htmx

Carson Gross had been arguing since intercooler.js (2013) that the web's original model, the server sends
HTML and links and forms change the page, was underrated, and that it only needed a few more capabilities.
htmx 1.0 (November 24, 2020) packaged that argument as HTML attributes: `hx-post`, `hx-target` and `hx-swap`
let any element make a request and put the HTML response anywhere on the page. In his essay on
"Hypermedia-Driven Applications" Gross framed it as a combination rather than a step back:

> The HDA architecture is a synthesis of two preceding architectures: the original Multi-Page Application
> (MPA) architecture and the (relatively) newer Single-Page Application architecture.
>
> — Carson Gross, "Hypermedia-Driven Applications" (2022)

htmx 2.0 followed in June 2024, and htmx 4.0 was released on August 28, 2026, published on npm under the
`next` tag while 2.x remains `latest`. Hotwire from 37signals, Laravel's Livewire and Phoenix LiveView take
related server-first approaches, and Alpine.js became the usual companion for small bits of client-side
behavior. [Chapter 13](13-htmx.md) and [Chapter 14](14-alpine.md) cover htmx and Alpine.

### Islands and Astro

In August 2020 Jason Miller (Preact's creator) described the **islands architecture**, crediting the name to
Etsy's Katie Sylor-Miller in 2019: render the page as static HTML on the server, and hydrate only the
interactive regions, each as its own small app. Astro (announced June 8, 2021, 1.0 on August 9, 2022) made
islands the default: pages ship zero JavaScript unless a component asks for it, and the islands can be
written in React, Vue, Svelte, Solid or others on the same page.

### React Server Components

React's answer, announced on December 21, 2020, was **React Server Components**: components that run only on
the server (or at build time), can read a database or file directly, and send their rendered output to the
browser without sending their code. Interactive components are marked with `'use client'` and hydrate as
before. Server Components became stable with React 19 on December 5, 2024, and Next.js's App Router is built
on them. It is, in a sense, PHP's model of 2004 rebuilt inside a component framework: server-side templates
that can query data inline, now able to nest client-side interactivity anywhere.

### Resumability: Qwik

Qwik, started at Builder.io by Miško Hevery (who had co-created AngularJS), attacked hydration itself.
Instead of re-running components in the browser to rebuild state, a Qwik app serializes its state and event
listener locations into the HTML. The browser **resumes** where the server stopped and downloads a
component's code only when the user interacts with it. Qwik 1.0 was announced on May 1, 2023.
[Chapter 11](11-qwik.md) covers it.

The common thread: the server renders HTML again, as it did in 2005, but the tools now let you choose, per
component, how much of the client-side model you need.

## Ember today: still shipping

Ember is easy to leave out of a modern survey, and this course does not give it a chapter. It deserves a
section here anyway, because it is the counterexample to the churn the rest of this history describes.

Ember has shipped a minor release roughly every six weeks for over a decade, with long-term-support (LTS)
releases for teams that upgrade slowly and a deprecate-then-remove policy that lets large apps upgrade in
steps instead of rewrites. As of November 2026:

- `ember-source` 7.4.0 (October 26, 2026) is the latest release, and 6.12 is the LTS line. Ember 7.0 (May
  2026) removed APIs deprecated during the 6.x series rather than introducing a new programming model.
- Since 6.8, new apps use Vite (through the Embroider build system) and **template tag** components by
  default: `.gjs`/`.gts` files with a `<template>` block inside JavaScript or TypeScript, with explicit
  imports instead of naming conventions.
- Reactivity is **autotracking**: properties marked `@tracked` are signals, and getters that read them are
  automatically derived. Ember 7.3 made `tracked` usable outside classes.
- Its users page lists companies such as LinkedIn, Intercom, Square, Discourse, HashiCorp, Netflix,
  Microsoft, Twitch, Zendesk and TED.

Ember's current component model would look familiar to anyone who has read this chapter: components,
signals-style tracked state, a compiler for templates, and a build on Vite. Rather than replace itself, it
absorbed the field's ideas one deprecation cycle at a time. Several people from the Ember community, including
co-creator Yehuda Katz, are among the champions of the TC39 Signals proposal.

## Timeline

```text
1995          JavaScript ships in Netscape Navigator
1999          XMLHTTP (later XMLHttpRequest) arrives in Internet Explorer 5
2005  Feb 18  Jesse James Garrett names "Ajax"
2006  Jan     jQuery introduced at BarCamp NYC; 1.0 on Aug 26
2008          Chrome and the V8 engine start the JavaScript speed race
2010  Jul 5   Knockout introduced (observables, automatic dependency tracking)
      Oct 13  Backbone 0.1.0
      Oct 20  AngularJS 0.9.0
2011  Dec 12  SproutCore 2.0 / Amber.js renamed Ember.js
2012  Jun 13  AngularJS 1.0
2013  May 29  React open-sourced (virtual DOM, JSX)
      Aug 31  Ember 1.0
2014  Feb     Vue.js launched
2015  Mar     React 0.13: ES6 class components
      Oct 27  Vue 1.0
2016  Sep 14  Angular 2.0 (TypeScript, Zone.js; a rewrite)
      Sep 30  Vue 2.0 (adds a virtual DOM)
      Oct 25  Next.js launched
      Nov 26  "Frameworks without the framework": Svelte introduced
2017  Sep     React 16 removes createClass from the core package
2019  Feb     React 16.8: hooks
      Apr 22  Svelte 3: "Rethinking reactivity"
2020  Aug     "Islands Architecture" (Jason Miller)
      Sep 18  Vue 3.0 (Proxy reactivity, Composition API)
      Nov 24  htmx 1.0
      Dec 21  React Server Components announced
2021  Jun 8   Astro introduced
      Jun 28  Solid 1.0
2022  Jan     AngularJS support ends (1.8.3 "ultimate-farewell" in April)
      Sep     Preact Signals
2023  May     Qwik 1.0; Angular 16 adds signals
2024  Apr     TC39 Signals proposal reaches Stage 1
      Jun 17  htmx 2.0
      Oct 22  Svelte 5 (runes)
      Dec 5   React 19 (Server Components stable)
2025  Jul     Vue 3.6 alpha with Vapor mode
      Oct     React Compiler 1.0
      Nov     Angular 21: zoneless by default
2026  Jan 17  jQuery 4.0.0
      Aug 28  htmx 4.0 (on npm's next tag)
      Oct 26  ember-source 7.4.0
      Nov     today: this course
```

## What the history teaches

Three patterns run through these thirty years, and they are worth carrying into the rest of the course.

**The core problem never changed.** Every framework here is an answer to "the data changed; what in the page
must change, and who does it?" jQuery left it to you. Backbone gave you events. Knockout and Vue tracked
dependencies. AngularJS checked everything. React re-rendered and diffed. Svelte compiled the answer at
build time. Solid and today's signals track it precisely at run time. When you meet a new framework, asking
which of these it does tells you most of what you need to know about how it will behave.

**Ideas come back.** Knockout's automatic dependency tracking (2010) is today's signals. Server-rendered
templates that query data are back as Server Components and htmx endpoints. Two-way binding fell out of
fashion and came back in a controlled form (`v-model`, Svelte's `bind:`, Angular's `model()` signals). An
idea that "failed" often failed because of its implementation or its era, not because it was wrong.

**The pendulum swings between server and browser.** The 1990s rendered on the server, the 2010s moved
everything to the browser, and the 2020s are finding a middle where the server renders by default and the
browser gets interactivity where it is needed. Each swing kept something from the previous one, so the
middle is richer than either end.

## Summary

- jQuery (2006) made DOM scripting work across browsers and is still the most deployed library, with 4.0.0
  released in January 2026; it gives no help with keeping the UI in sync with data.
- The MV* frameworks (2010–2013) answered the sync problem in different ways: Backbone with model events,
  Knockout with observables and automatic dependency tracking, AngularJS with two-way binding and dirty
  checking, Ember with conventions and a router-first design.
- React (2013) re-rendered a virtual DOM description of the whole UI and diffed it, with one-way data flow
  and JSX; hooks (2019) changed the API but not the model.
- Vue (2014) blended template directives with dependency tracking; Angular 2 (2016) was a TypeScript rewrite
  of AngularJS; Svelte (2016–2019) moved work into a compiler.
- The signals era (Solid 1.0 in 2021, then Preact, Angular, Svelte 5, Vue Vapor) brought fine-grained
  updates back to the mainstream, and a TC39 Signals proposal sits at Stage 1.
- The return to the server includes framework SSR with hydration, htmx and hypermedia, islands (Astro),
  React Server Components and Qwik's resumability.
- Ember 7.4 (October 2026) shows another path: steady six-week releases that absorbed the field's ideas
  without a rewrite.

## Exercises

1. **Put them in order.** Without looking back, order these by first public release: Vue, Knockout, Solid
   1.0, React, htmx 1.0, AngularJS 0.9, Svelte (first announcement), jQuery, Backbone, Angular 2.0.

   <details><summary>Solution</summary>

   jQuery (January 2006), Knockout (July 2010), Backbone (October 13, 2010), AngularJS 0.9 (October 20,
   2010), React (May 2013), Vue (February 2014), Angular 2.0 (September 2016), Svelte (November 2016),
   htmx 1.0 (November 2020), Solid 1.0 (June 2021).

   The three 2010 entries are the ones most people get wrong: Knockout came first, by three months, and
   Backbone beat AngularJS by a week. All three appeared within the same four months, which shows how
   widely the "jQuery is not enough for apps" problem was felt.

   </details>

2. **Remove, the jQuery way.** Copy `examples/ch02/jquery.html` and add a Remove button to each item that
   deletes it and keeps the count correct. Notice how many places have to change.

   <details><summary>Solution</summary>

   `examples/ch02/solutions/jquery-remove.html`
   ```html
   <!doctype html>
   <html lang="en">
   <meta charset="utf-8">
   <title>jQuery: a list with Remove</title>
   <form id="add">
     <input id="title" aria-label="New item">
     <button>Add</button>
   </form>
   <ul id="items"></ul>
   <p id="count">0 items</p>
   <script src="../node_modules/jquery/dist/jquery.min.js"></script>
   <script>
     $(function () {
       function updateCount() { // the count is derived, but you must remember to call this
         var n = $('#items li').length;
         $('#count').text(n + (n === 1 ? ' item' : ' items'));
       }

       $('#add').on('submit', function (event) {
         event.preventDefault();
         var title = $('#title').val().trim();
         if (!title) return;
         var remove = $('<button type="button">Remove</button>').attr('aria-label', 'Remove ' + title);
         $('<li>').append($('<span>').text(title), ' ', remove).appendTo('#items');
         updateCount();
         $('#title').val('');
       });

       // One delegated handler covers items that do not exist yet.
       $('#items').on('click', 'button', function () {
         $(this).closest('li').remove();
         updateCount();
       });
     });
   </script>
   ```

   Three things had to change. Each `<li>` now contains a span and a button, built by hand with `.text()`
   so a title can never inject HTML. The count can no longer be a variable you increment, because removal
   would need a matching decrement, so `updateCount()` recomputes it from the DOM, and both handlers must
   remember to call it. And because the buttons are created later, the click handler is **delegated**: one
   listener on the `<ul>` handles clicks on any button inside it, now or in the future. Forget any one of
   these and the page is subtly wrong. That is the "keep the UI in sync by hand" problem in miniature.

   </details>

3. **Remove, the Knockout way.** Now do the same in `examples/ch02/knockout.html` and compare.

   <details><summary>Solution</summary>

   `examples/ch02/solutions/knockout-remove.html`
   ```html
   <!doctype html>
   <html lang="en">
   <meta charset="utf-8">
   <title>Knockout: a list with Remove</title>
   <form data-bind="submit: add">
     <input aria-label="New item" data-bind="textInput: title">
     <button>Add</button>
   </form>
   <ul data-bind="foreach: items">
     <li>
       <span data-bind="text: $data"></span>
       <button type="button" data-bind="click: $parent.remove, attr: { 'aria-label': 'Remove ' + $data }">Remove</button>
     </li>
   </ul>
   <p data-bind="text: countText"></p>
   <script src="../node_modules/knockout/build/output/knockout-latest.js"></script>
   <script>
     function ListViewModel() {
       var self = this;
       self.title = ko.observable('');
       self.items = ko.observableArray([]);
       self.countText = ko.computed(function () {
         var n = self.items().length;
         return n + (n === 1 ? ' item' : ' items');
       });
       self.add = function () {
         var title = self.title().trim();
         if (!title) return;
         self.items.push(title);
         self.title('');
       };
       self.remove = function (item) { // Knockout passes the clicked item; countText follows by itself
         self.items.remove(item);
       };
     }

     ko.applyBindings(new ListViewModel());
   </script>
   ```

   The change is one binding in the template and a two-line `remove` function. Inside `foreach`, `$data` is
   the current item and `$parent` is the view model; Knockout calls `$parent.remove` with the clicked item.
   `countText` needs no change at all, because it read `items()` the last time it ran, so Knockout reruns it
   when the array changes. Nothing has to be remembered: the dependency was recorded automatically. This is
   the property that signals-based frameworks are built on (see
   [Chapter 15](15-reactivity-compared.md)).

   </details>

4. **Spot the era.** Each line comes from a different period. Name the library or framework, and what the
   line tells you about how it detects changes.

   ```js
   $scope.items.push(title);
   self.items.push(title);
   this.setState({ items: this.state.items.concat([title]) });
   items.push(title); // in a .svelte file, Svelte 5
   ```

   <details><summary>Solution</summary>

   - `$scope.items.push(title)` is **AngularJS**. It mutates a plain array; AngularJS notices during the next
     digest cycle by re-evaluating every watched expression and comparing (dirty checking).
   - `self.items.push(title)` is **Knockout**. `items` is an `observableArray`, so `push` is Knockout's own
     method, which notifies everything that read `items()`: dependency tracking with explicit wrappers.
   - `this.setState(...)` is **React** in the class or `createClass` style. Nothing is tracked; `setState`
     schedules a re-render, and the virtual DOM diff finds what changed. The new array (`concat`) matters,
     because React compares state by reference.
   - `items.push(title)` in Svelte 5 works when `items` was declared with `$state([])`. The rune wraps the
     array in a deeply reactive proxy, so mutating it notifies the parts of the template that read it:
     signals, set up by the compiler. (In Svelte 3 and 4 you had to reassign, `items = [...items, title]`,
     because reactivity was triggered by assignment.)

   </details>

Sources for this chapter: [REFERENCES.md](REFERENCES.md#chapter-2--a-short-history)
