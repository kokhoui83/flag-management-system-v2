import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// Web dashboard unit tier: Vitest + happy-dom + @vue/test-utils component tests.
// The dashboard has no server-side tests; API calls are mocked in component tests.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
