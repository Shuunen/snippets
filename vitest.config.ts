import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-anonymous-default-export
export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      exclude: ['**/*.types.ts', 'tests/utils.ts'],
      thresholds: {
        100: true,
      },
    },
  },
})
