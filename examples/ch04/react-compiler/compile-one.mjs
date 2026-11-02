// Prints what the React Compiler does to one component.
// Usage: node compile-one.mjs src/components/FilterBar.tsx
import { transformFileSync } from '@babel/core'

const { code } = transformFileSync(process.argv[2], {
  babelrc: false,
  configFile: false,
  parserOpts: { plugins: ['jsx', 'typescript'] },
  plugins: ['babel-plugin-react-compiler'],
})
console.log(code)
