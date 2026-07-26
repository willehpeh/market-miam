/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  ANGULAR_TESTBED_INIT,
  angularJitPlugins,
  angularJitResolve,
} from '../../tools/vitest/angular-jit.mts';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Standalone Vitest config for admin-frontend, equivalent to
 * `nx test admin-frontend`. See tools/vitest/angular-jit.mts for how the Angular
 * JIT environment is reproduced without the `@angular/build:unit-test` executor.
 *
 * This app has no `src/environments` directory and no `test-setup.ts`, so only
 * the TestBed bootstrap is registered as a setup file.
 */
export default defineConfig({
  root: projectRoot,
  cacheDir: '../../node_modules/.vite/admin-frontend',
  plugins: [nxViteTsPaths(), ...angularJitPlugins(projectRoot, { replaceEnvironment: false })],
  resolve: angularJitResolve,
  test: {
    name: 'admin-frontend',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: [ANGULAR_TESTBED_INIT],
    sequence: { setupFiles: 'list' },
    isolate: true,
    reporters: ['default'],
  },
});
