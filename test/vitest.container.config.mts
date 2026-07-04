import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Testcontainers-backed specs (real Postgres via Docker). Kept out of the fast
// unit suite; run with `nx test:container test`.
process.env.TZ = 'America/New_York';

export default defineConfig(() => ({
  root: `${__dirname}/..`,
  cacheDir: '../node_modules/.vite/testing-container',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'test-container',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['test/{src,tests}/**/*.container.spec.{ts,mts}'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    reporters: ['default'],
  },
}));
