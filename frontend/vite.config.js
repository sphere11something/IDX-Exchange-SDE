import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:5001' } },
  // `npm test` runs Vitest (same API as Jest: describe/it/expect, vi.fn() is jest.fn()).
  // jsdom gives the tests a fake browser DOM; globals lets Testing Library auto-clean between tests.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
