import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Testcontainers-backed specs (real Postgres via Docker). Kept out of the fast
// unit suite; run with `nx test:container api`.
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/api-container',
  plugins: [
    nxViteTsPaths(),
    swc.vite({
      jsc: {
        target: 'es2021',
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
      },
    }),
  ],
  test: {
    name: 'api-container',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.container.spec.{ts,mts}'],
    setupFiles: ['reflect-metadata'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    reporters: ['default'],
  },
}));
