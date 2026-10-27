import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// Reuses the app's Vite config (React plugin) and adds the test environment.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      restoreMocks: true,
    },
  }),
)
