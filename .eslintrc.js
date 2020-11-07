const rules = require('./.eslintrc.rules.js')

module.exports = {
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:unicorn/recommended',
  ],
  rules,
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    'html',
    'unicorn',
  ],
}
