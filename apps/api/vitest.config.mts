import { defineConfig, configDefaults } from 'vitest/config';
import swc from 'unplugin-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/api',
  plugins: [
    nxViteTsPaths(),
    // SWC transform so @nestjs decorators emit `design:paramtypes` metadata,
    // which esbuild (vitest's default transform) does not.
    swc.vite({
      jsc: {
        target: 'es2021',
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
      },
    }),
  ],
  test: {
    name: 'api',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Testcontainers specs need Docker + are slow — run them via `test:container`, not here.
    exclude: [...configDefaults.exclude, '**/*.container.spec.*'],
    setupFiles: ['reflect-metadata'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/api',
      provider: 'v8' as const,
      // `all` so untested files surface as 0% rather than silently vanishing
      // — the app tree is where the consumer/tracing infra lives.
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts', // bootstrap
        'src/app/app.module.ts', // composition root: prod-only Auth0 + config wiring
        'src/tracing.ts', // OTel SDK bootstrap (side-effect import)
        'src/app/testing/**', // test harness
      ],
    },
  },
}));
