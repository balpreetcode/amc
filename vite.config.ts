import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3465,
    proxy: {
      '/workflow': 'http://localhost:3002',
      '/health': 'http://localhost:3002',
      '/api': 'http://localhost:3002',
      '/download': 'http://localhost:3002',
      '/session': 'http://localhost:3002'
    }
  }
})
