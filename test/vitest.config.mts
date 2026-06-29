import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

// Pin a fixed, non-UTC timezone so date/time behaviour is deterministic and
// timezone bugs (e.g. UTC vs local calendar date) are caught rather than masked.
process.env.TZ = 'America/New_York';

export default defineConfig(() => ({
  root: `${__dirname}/..`,
  cacheDir: '../node_modules/.vite/testing',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'test',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['test/{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: 'coverage/test',
      provider: 'v8' as const,
      include: ['packages/**/src/**/*.ts']
    },
  },
}));
