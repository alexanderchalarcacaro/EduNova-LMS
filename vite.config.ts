import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
    minify: false,
    cssMinify: false,
    rollupOptions: {
      cache: false,
      maxParallelFileOps: 1,
    }
  }
})
