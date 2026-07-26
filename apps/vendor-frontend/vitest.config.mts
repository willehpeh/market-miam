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
 * Standalone Vitest config for vendor-frontend, equivalent to
 * `nx test vendor-frontend` (176 tests across 22 spec files) but runnable
 * without the `@angular/build:unit-test` executor — which is what Stryker's
 * Vitest runner needs. See tools/vitest/angular-jit.mts for the details.
 *
 * Coverage is intentionally left off here; `nx test vendor-frontend` remains the
 * source of truth for coverage reporting.
 */
export default defineConfig({
  root: projectRoot,
  cacheDir: '../../node_modules/.vite/vendor-frontend',
  plugins: [nxViteTsPaths(), ...angularJitPlugins(projectRoot)],
  resolve: angularJitResolve,
  test: {
    name: 'vendor-frontend',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: [ANGULAR_TESTBED_INIT, path.join(projectRoot, 'src/test-setup.ts')],
    sequence: { setupFiles: 'list' },
    // Isolation must stay ON. The Angular builder can afford `isolate: false`
    // because it hands Vitest pre-bundled spec entry points; running the raw
    // sources in a shared context leaks TestBed state between spec files
    // ("Cannot configure the test module when the test module has already been
    // instantiated") and fails ~150 of the 176 tests.
    isolate: true,
    reporters: ['default'],
  },
});
