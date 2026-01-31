import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  worker: {
    format: 'es',
    plugins: () => []
  },
  server: {
    port: 8556,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8550',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
