import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // `any` is a code smell worth flagging, but not a CI blocker for this codebase.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Honour the `_`-prefix convention for intentionally unused vars/args/catch bindings.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Fast-refresh hint is dev-only ergonomics, not correctness.
      'react-refresh/only-export-components': 'warn',
      // React Compiler rules (eslint-plugin-react-hooks v7). This project does not use
      // the React Compiler, so treat these as advisory warnings. rules-of-hooks and
      // exhaustive-deps remain at their recommended levels.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
])
