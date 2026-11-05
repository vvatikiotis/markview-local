import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/core/**/*.ts', 'src/utils/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/main.ts',
        'src/background.ts',
        'src/popup/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@components': path.resolve(import.meta.dirname, './src/components'),
      '@core': path.resolve(import.meta.dirname, './src/core'),
      '@utils': path.resolve(import.meta.dirname, './src/utils'),
      '@plugins': path.resolve(import.meta.dirname, './src/plugins'),
      '@styles': path.resolve(import.meta.dirname, './src/styles'),
      '@types': path.resolve(import.meta.dirname, './src/types'),
    },
  },
});
