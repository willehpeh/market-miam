import { defineConfig } from 'vitest/config';
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
    setupFiles: ['reflect-metadata'],
    reporters: ['default'],
  },
}));
