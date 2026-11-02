// Exercise 1: the count label with Intl.PluralRules instead of `left === 1`.
// Run: node count-label.ts
const rules = new Intl.PluralRules('en-US')
const nouns: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'task', other: 'tasks' }

export function countLabel(left: number): string {
  return `${left} ${nouns[rules.select(left)] ?? nouns.other} left`
}

for (const left of [0, 1, 2, 21]) {
  console.log(countLabel(left))
}
