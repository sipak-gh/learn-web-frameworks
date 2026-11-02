import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), vue()],
  server: { port: 4336, strictPort: true },
  preview: { port: 4336, strictPort: true },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', urlFilter: 'url-filter.html' },
    },
  },
})
