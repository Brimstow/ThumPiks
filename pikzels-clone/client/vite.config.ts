import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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