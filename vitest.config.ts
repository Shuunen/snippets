import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-anonymous-default-export
export default defineConfig({
  test: {
    coverage: {
      100: true,
      reporter: ['text', 'lcov', 'html'],
    },
  },
})
