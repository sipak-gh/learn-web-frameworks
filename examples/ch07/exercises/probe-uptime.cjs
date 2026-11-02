// Reads the uptime line, waits, reads it again, clicks a filter, reads again.
const path = require('node:path');
const { chromium } = require(path.join(__dirname, '../../../tasklet/e2e/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.argv[2]);
  const uptime = page.locator('p.uptime');
  await uptime.waitFor();
  console.log('at load:          ', await uptime.textContent());
  await page.waitForTimeout(3500);
  console.log('after 3.5 s:      ', await uptime.textContent());
  const active = page.getByRole('button', { name: 'Active' });
  await active.click();
  // Wait for the re-render that the click caused before reading again.
  await page.waitForFunction((button) => button.getAttribute('aria-pressed') === 'true', await active.elementHandle());
  console.log('after a click:    ', await uptime.textContent());
  await browser.close();
})();
