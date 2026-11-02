import { attach } from './tasks.mjs';

const list = document.querySelector('#tasks');
const tasks = JSON.parse(document.querySelector('#data').textContent);
attach(list, tasks); // the DOM is already there: only wire it up
