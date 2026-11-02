import { renderTasks, attach } from './tasks.mjs';

const list = document.querySelector('#tasks');
const tasks = await (await fetch('/api/tasks')).json();
list.innerHTML = renderTasks(tasks); // build the DOM in the browser
attach(list, tasks);
