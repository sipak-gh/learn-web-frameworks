// Exercise 1: a hostile title must come back as text, never as markup.
// Run with `npm test` in examples/ch13.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeHtml, html } from '../../tasklet/htmx/src/html.ts'
import { taskItem } from '../../tasklet/htmx/src/views.ts'

const evil = `<img src=x onerror="alert('hi')">`

test('escapeHtml replaces the five special characters', () => {
  assert.equal(escapeHtml(evil), '&lt;img src=x onerror=&quot;alert(&#39;hi&#39;)&quot;&gt;')
  assert.equal(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry')
})

test('html`` escapes values but keeps nested html`` as markup', () => {
  const inner = html`<b>${'<i>'}</b>`
  assert.equal(html`<p>${inner}${'<br>'}</p>`.value, '<p><b>&lt;i&gt;</b>&lt;br&gt;</p>')
})

test('a task titled with markup renders as text in the span and the aria-label', () => {
  const markup = taskItem({ id: '7', title: evil, done: false }).value
  assert.ok(!markup.includes('<img'), 'no raw <img> tag')
  assert.ok(markup.includes(`<span>${escapeHtml(evil)}</span>`))
  assert.ok(markup.includes(`aria-label="Delete &quot;&lt;img`))
})
