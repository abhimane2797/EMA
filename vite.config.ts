import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // With VITE_API_BASE_URL=/api/v1 the SPA talks to the NestJS service
    // (master_backend, global prefix `api/v1`) same-origin — no CORS needed.
    // Change the target if the backend runs elsewhere.
    proxy: {
      '/api/v1': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  define: { 'process.env': {} }
})
