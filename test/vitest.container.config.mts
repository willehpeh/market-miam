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
    coverage: {
      enabled: true,
      reportsDirectory: 'coverage/test-container',
      provider: 'v8' as const,
      include: ['packages/**/src/**/*.ts'],
      // `all: false` — this suite speaks only for the adapters it drives. The
      // files it never touches are the unit suite's story, and reporting them
      // at 0% here is what made the postgres adapters look untested.
      all: false,
    },
  },
}));
