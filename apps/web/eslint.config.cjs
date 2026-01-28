const sharedConfig = require('@lightloop/config/eslint')
const reactHooks = require('eslint-plugin-react-hooks')

module.exports = [
  ...sharedConfig,
  {
    ignores: ['dist/**', '.vite-temp/**', 'node_modules.bak/**'],
  },
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
