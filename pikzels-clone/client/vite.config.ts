import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  html: {
    // CSP nonce placeholder — replaced per-request by the server serving the HTML.
    // Vite injects nonce="__CSP_NONCE__" on <script>, <link>, and <style> tags,
    // plus a <meta property="csp-nonce" nonce="__CSP_NONCE__"> for runtime use.
    // The placeholder must be replaced with a unique random value per request.
    cspNonce: '__CSP_NONCE__',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../src/config'),
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin/index.html'),
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => []
  },
  server: {
    port: 8556,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8550',
        changeOrigin: true,
        secure: false,
      },
      '/processed-images': {
        target: 'http://localhost:8550',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
