import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { renderTasks } from './public/tasks.mjs';

const tasks = [
  { id: '1', title: 'Read the Vue chapter', done: false },
  { id: '2', title: 'Try Svelte runes', done: false },
  { id: '3', title: 'Write a signal from scratch', done: true },
];

// Escape "<" so a title containing "</script>" can't end the data block early.
const serialize = (data) => JSON.stringify(data).replaceAll('<', '\\u003c');

const page = (body, script) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Tasks</title></head>
<body>
<h1>Tasks</h1>
${body}
<script type="module" src="/${script}"></script>
</body>
</html>
`;

const routes = {
  '/csr': () => page('<ul id="tasks"></ul>', 'csr.mjs'),
  '/ssr': () =>
    page(
      `<ul id="tasks">${renderTasks(tasks)}</ul>
<script type="application/json" id="data">${serialize(tasks)}</script>`,
      'hydrate.mjs',
    ),
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (routes[pathname]) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(routes[pathname]());
  } else if (pathname === '/api/tasks') {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(tasks));
  } else if (/^\/[\w-]+\.mjs$/.test(pathname)) {
    const js = await readFile(new URL(`./public${pathname}`, import.meta.url));
    res.writeHead(200, { 'content-type': 'text/javascript' }).end(js);
  } else {
    res.writeHead(404).end('Not found');
  }
}).listen(4438, () => console.log('http://localhost:4438/csr and /ssr'));
