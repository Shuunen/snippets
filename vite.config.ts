import { defineConfig } from 'vitest/config'

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/*.types.ts', 'src/bin/lint.rules.ts'],
      provider: 'v8' as const,
    },
    globals: true,
    include: ['**/*.test.{ts,js}'],
    reporters: ['dot'],
    silent: true,
  },
})
