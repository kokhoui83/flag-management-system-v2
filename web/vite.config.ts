import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Dev server proxy: /api → management API (:3000) (architecture §10 dev loop).
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
