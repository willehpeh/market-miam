import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Exploratory scenarios: the whole api on a real Postgres, run by hand, not in CI.
// Deliberately separate from `nx test api` (fast, in-memory) and from the container
// specs — a scenario may run for minutes and is allowed to.
process.env.TZ = 'America/New_York';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/api-scenario',
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
    name: 'api-scenario',
    watch: false,
    globals: true,
    environment: 'node',
    // `.scenario.ts`, not `.spec.ts` — invisible to every other runner by construction.
    include: ['src/**/*.scenario.ts'],
    // No limit: a scenario is over when it says it is, not at 60s.
    testTimeout: 0,
    hookTimeout: 180_000,
    // One container's worth of database at a time.
    fileParallelism: false,
    reporters: ['default'],
  },
}));
