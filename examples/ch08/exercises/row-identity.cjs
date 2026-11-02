// Toggles the first task and reports whether its <li> is still the same node.
// Also echoes anything the app logs to the console.
const path = require('node:path');
const { chromium } = require(path.join(__dirname, '../../../tasklet/e2e/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (message) => console.log('console:', message.text()));
  await page.goto(process.argv[2]);
  const first = () => document.querySelector('li.task');
  await page.getByRole('list', { name: 'Tasks' }).waitFor();
  await page.evaluate(`window.before = (${first})()`);
  console.log('toggling the first task');
  await page.getByRole('checkbox').first().click();
  console.log('same <li> after toggle:', await page.evaluate(`(${first})() === window.before`));
  await browser.close();
})();
