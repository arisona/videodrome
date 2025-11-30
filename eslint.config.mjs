/* ESLint flat config for Videodrome */
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      'dist/',
      'release/',
      'node_modules/',
      '**/*.config.js',
      '**/*.config.cjs',
      'vite.config.ts',
    ],
  },

  // Base config for all files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cjs'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        // Node globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      'unused-imports': unusedImports,
      promise: promisePlugin,
      security: securityPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // ESLint recommended rules
      ...eslint.configs.recommended.rules,

      // TypeScript ESLint strict rules
      ...tseslint.configs['strict-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,

      // Import plugin rules
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,

      // Promise plugin rules
      ...promisePlugin.configs.recommended.rules,

      // Security plugin rules
      ...securityPlugin.configs.recommended.rules,

      // Prettier rules
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // Custom TypeScript strictness rules
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: false }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignoreTernaryTests: false }],
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports

      // Unused imports / vars cleanup
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Import ordering & hygiene
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-default-export': 'off', // Allow default exports (Hydra)

      // Promise best practices
      'promise/always-return': 'off',

      // Security plugin adjustments (Electron contextBridge is trusted here)
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

      // Allow eval in controlled renderer contexts - restrict otherwise
      'no-eval': 'error',
      // TypeScript handles undefined symbols; core rule is redundant
      'no-undef': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.eslint.json'],
        },
        node: true,
      },
    },
  },

  // Override for Hydra renderer files that need eval
  {
    files: ['src/renderer/output.ts', 'src/renderer/editor.ts'],
    rules: {
      // We deliberately sandbox Hydra user code via Function/eval patterns
      'no-eval': 'off',
    },
  },

  // Override for TypeScript declaration files
  {
    files: ['*.d.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Override for files using Vite worker imports
  {
    files: ['src/renderer/monaco-setup.ts'],
    rules: {
      // Vite's ?worker suffix is a build-time transformation that ESLint can't resolve
      'import/default': 'off',
    },
  },
];
