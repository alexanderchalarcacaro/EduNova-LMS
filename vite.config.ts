import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          sanity: ['sanity'],
          react: ['react', 'react-dom'],
          clerk: ['@clerk/clerk-react']
        }
      }
    }
  }
})
