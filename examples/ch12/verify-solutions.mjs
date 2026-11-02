// Checks the exercise solutions in headless Chromium.
// Run: npm run verify:solutions
import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const open = async (path, options) => {
  const page = await browser.newPage(options)
  await page.goto(new URL(path, import.meta.url).href)
  return page
}

// Exercise 1: does <toggle-chip hidden> hide?
for (const path of ['hidden.html', 'solutions/hidden.html']) {
  const page = await open(path)
  const display = await page.$eval('#hidden', (el) => getComputedStyle(el).display)
  console.log(`${path}: <toggle-chip hidden> display ${display}, visible ${await page.isVisible('#hidden')}`)
  await page.close()
}

// Exercise 2: a form-associated chip.
{
  const page = await open('solutions/form.html')
  const entries = () => page.$eval('form', (form) => JSON.stringify([...new FormData(form)]))
  console.log(`\nform data before: ${await entries()}`)
  await page.getByRole('button', { name: 'Urgent' }).click()
  console.log(`after clicking the chip: ${await entries()}`)
  console.log(`chip.form is the form: ${await page.$eval('form-toggle-chip', (chip) => chip.form === document.querySelector('form'))}`)
  console.log(`form.elements: ${await page.$eval('form', (form) => JSON.stringify([...form.elements].map((el) => el.localName)))}`)
  await page.getByRole('button', { name: 'Reset' }).click()
  console.log(`after Reset: ${await entries()}, pressed ${await page.$eval('form-toggle-chip', (chip) => chip.pressed)}`)
  await page.close()
}

// Exercise 3: Declarative Shadow DOM, with JavaScript turned off in the page.
{
  const page = await open('solutions/declarative.html', { javaScriptEnabled: false })
  const card = page.locator('task-card')
  console.log(`\nJavaScript enabled in the page: false`)
  console.log(`task-card has a shadow root: ${await card.evaluate((el) => el.shadowRoot?.mode ?? null)}`)
  console.log(`<template> left in the light DOM: ${await card.evaluate((el) => el.querySelector('template') !== null)}`)
  console.log(`shadow <p> color: ${await card.evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('p')).color)}`)
  console.log(`page <p> color: ${await page.$eval('body > p', (p) => getComputedStyle(p).color)}`)
  console.log(`visible text: ${JSON.stringify(await card.innerText())}`)
  await page.close()
}

await browser.close()
