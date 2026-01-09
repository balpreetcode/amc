import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'custom-server-message',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            const SESSION_TOKEN = 'dev-master-token-2024';
            console.log('\n');
            console.log('  \x1b[1m\x1b[32m➜\x1b[0m  \x1b[1mFlow Builder with Session:\x1b[0m');
            console.log(`     \x1b[36mhttp://localhost:3465/?sessiontoken=${SESSION_TOKEN}\x1b[0m`);
            console.log('\n');
          }, 100);
        });
      }
    }
  ],
  server: {
    port: 3465,
    proxy: {
      '/workflow': 'http://localhost:3002',
      '/health': 'http://localhost:3002',
      '/api': 'http://localhost:3002',
      '/templates': 'http://localhost:3002',
      '/template': 'http://localhost:3002',
      '/download': 'http://localhost:3002',
      '/output': 'http://localhost:3002',
      '/session': 'http://localhost:3002',
      '/auth': 'http://localhost:3002',
      '/workflows': 'http://localhost:3002',
      '/executions': 'http://localhost:3002',
      '/nodes': 'http://localhost:3002'
    }
  }
})
