// Shared by the server (to render HTML) and the browser (to render or hydrate).
const escape = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderTasks(tasks) {
  return tasks
    .map((t) => `<li><button type="button" data-id="${t.id}" aria-pressed="${t.done}">${escape(t.title)}</button></li>`)
    .join('');
}

export function attach(list, tasks) {
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const task = tasks.find((t) => t.id === button.dataset.id);
    task.done = !task.done;
    button.setAttribute('aria-pressed', String(task.done));
  });
}
