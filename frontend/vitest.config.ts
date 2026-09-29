import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Default stays Node for the existing pure-logic suites. Vitest 4 dropped
    // `environmentMatchGlobs`, so component tests opt into a real DOM via a
    // `// @vitest-environment jsdom` docblock at the top of the *.test.tsx file
    // instead — keeps the 22 existing node-environment tests untouched.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Keep DOM-heavy suites from competing for every CPU on hosted runners.
    // Local runs retain Vitest's default worker selection.
    maxWorkers: process.env.CI ? 2 : undefined,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
