import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from 'eslint-plugin-vitest';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/graphify-out/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  vitest.configs.recommended,
  prettier,
);
