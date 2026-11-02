// Usage: node score.mjs <scenario.json>
//
// A weighted decision matrix. The scenario file lists criteria with weights
// (how much each matters to you, 0–5) and, per candidate, a score per
// criterion (how well it does, 1–5). Those are your judgments, written down.
// Optionally, "maxBaselineKb" drops candidates whose Tasklet build (from
// tasklet/tools/compare-results.json) is larger, gzipped, than that budget.
//
// It prints the ranking, then a sensitivity check: for each criterion, does
// the winner change if that weight goes one step up or down? If it does, or
// if the top two are within 5 points, the decision is close and should be
// made on something the matrix doesn't hold.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const scenario = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const compare = JSON.parse(
  readFileSync(join(resolve(import.meta.dirname, '../../tasklet/tools'), 'compare-results.json'), 'utf8'),
)
const baselineKb = Object.fromEntries(compare.results.map((r) => [r.app, r.size.gzip / 1000]))

const candidates = Object.keys(scenario.scores).filter((name) => {
  const kb = baselineKb[name]
  if (scenario.maxBaselineKb === undefined || kb === undefined || kb <= scenario.maxBaselineKb) return true
  console.log(`dropped ${name}: Tasklet baseline ${kb.toFixed(2)} kB > ${scenario.maxBaselineKb} kB budget`)
  return false
})

function rank(weights) {
  const max = 5 * Object.values(weights).reduce((a, b) => a + b, 0)
  return candidates
    .map((name) => {
      const total = Object.entries(weights).reduce((sum, [criterion, w]) => sum + w * scenario.scores[name][criterion], 0)
      return { name, percent: Math.round((100 * total) / max) }
    })
    .sort((a, b) => b.percent - a.percent)
}

const ranking = rank(scenario.weights)
console.log(`\n${scenario.name}\n`)
for (const { name, percent } of ranking) console.log(`${name.padEnd(10)} ${String(percent).padStart(3)}%  ${'#'.repeat(percent / 5)}`)
if (ranking.length > 1 && ranking[0].percent - ranking[1].percent <= 5) {
  console.log(`\n${ranking[0].name} and ${ranking[1].name} are within 5 points: treat it as a tie.`)
}

console.log('\nSensitivity (winner if one weight changes by one step):')
for (const criterion of Object.keys(scenario.weights)) {
  const winners = [-1, 1].map((step) => {
    const w = Math.min(5, Math.max(0, scenario.weights[criterion] + step))
    return rank({ ...scenario.weights, [criterion]: w })[0].name
  })
  const flips = winners.some((name) => name !== ranking[0].name)
  console.log(`  ${criterion.padEnd(12)} ${winners.join(' / ')}${flips ? '   <- close call' : ''}`)
}
