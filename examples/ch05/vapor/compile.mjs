// Compiles TaskItem.vue twice with @vue/compiler-sfc: once as a normal (virtual DOM)
// component, once in Vapor mode. Run: node compile.mjs [vdom|vapor]
import { readFileSync } from 'node:fs'
import { compileScript, parse } from 'vue/compiler-sfc'

const mode = process.argv[2] ?? 'vapor'
let source = readFileSync('src/components/TaskItem.vue', 'utf8')
if (mode === 'vdom') source = source.replace('<script setup vapor', '<script setup')

const { descriptor } = parse(source, { filename: 'TaskItem.vue' })
const { content } = compileScript(descriptor, { id: 'task-item', inlineTemplate: true })
console.log(content)
