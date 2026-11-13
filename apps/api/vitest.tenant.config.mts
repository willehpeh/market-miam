import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Contracts run against a real Auth0 test tenant, by hand: it needs the tenant's
// credentials and the network, so neither `nx test api` nor CI runs it.
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/api-tenant',
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
    name: 'api-tenant',
    watch: false,
    globals: true,
    environment: 'node',
    // `.tenant.ts`, not `.spec.ts` — invisible to every other runner by construction.
    include: ['src/**/*.tenant.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One tenant, shared state: one file at a time.
    fileParallelism: false,
    reporters: ['default'],
  },
}));
