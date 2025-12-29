import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html']],
});
