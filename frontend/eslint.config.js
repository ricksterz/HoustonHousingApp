import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // setState at the top of a useEffect for loading/error resets is the
      // standard async-fetch pattern used throughout this codebase.
      'react-hooks/set-state-in-effect': 'warn',
      // This is a static-export site; Fast Refresh HMR rules don't apply.
      'react-refresh/only-export-components': 'warn',
    },
  },
  // vite.config.js runs in Node, not the browser
  {
    files: ['vite.config.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
])
