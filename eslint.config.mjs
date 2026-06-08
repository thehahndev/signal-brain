import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['node_modules/**', '.next/**', 'engine/**', 'spike/**', 'drizzle/**', 'scripts/**'],
  },
  {
    rules: {
      // Allow intentionally-unused args/vars prefixed with `_` (e.g. clean()'s sourceType).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
