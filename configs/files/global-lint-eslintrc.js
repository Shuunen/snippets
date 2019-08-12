// Global ESlint rules with Standard
module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'standard',
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 8,
  },
  rules: {
    'linebreak-style': ['error', 'unix'],
    'no-console': 'off',
    'func-names': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
  },
}
