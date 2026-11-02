import { defineConfig } from '@rspack/cli'

export default defineConfig({
  mode: 'production',
  entry: './src/main.ts',
  output: { path: `${import.meta.dirname}/dist/rspack`, clean: true },
  devtool: 'source-map',
  module: {
    rules: [{ test: /\.ts$/, loader: 'builtin:swc-loader', type: 'javascript/auto' }],
  },
})
