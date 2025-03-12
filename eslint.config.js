import shuunen from 'eslint-plugin-shuunen'

export default [
  ...shuunen.configs.base,
  ...shuunen.configs.node,
  ...shuunen.configs.browser,
  ...shuunen.configs.typescript,
  {
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ['**/*.cli.*'],
    rules: {
      'unicorn/no-process-exit': 'off',
    },
  },
]
