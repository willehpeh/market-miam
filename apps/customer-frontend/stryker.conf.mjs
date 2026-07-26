/**
 * Mutation testing for customer-frontend.
 *
 * Unlike vendor-frontend and admin-frontend this app CANNOT use Stryker's
 * `vitest` runner. The standalone `apps/customer-frontend/vitest.config.mts`
 * compiles components with Angular's JIT compiler, and JIT does not support the
 * signal-based APIs this app uses (`input()`, `input.required()`, `viewChild()`):
 * `parseInputsArray()` in @angular/compiler hardcodes `isSignal: false`, so
 * `TestBed`'s `setInput` fails with NG0303 and 11 of the 25 tests fail. Only
 * ngtsc (AOT), i.e. `nx test`, compiles those correctly.
 *
 * So this config shells out to the real Angular test target via the `command`
 * runner. The cost is `coverageAnalysis: 'off'` — every mutant re-runs the whole
 * suite, including the esbuild application build.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  testRunner: 'command',
  commandRunner: {
    // `--skipNxCache` so a cached PASS from a previous mutant is never replayed.
    // The Nx daemon is disabled because each mutant runs in a fresh sandbox
    // directory and a daemon started for a deleted workspace root hangs.
    command: 'NX_DAEMON=false npx nx test customer-frontend --skipNxCache',
  },
  // Forced by the command runner: it can only observe the suite's exit code.
  coverageAnalysis: 'off',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/customer-frontend.html' },
  jsonReporter: { fileName: 'reports/mutation/customer-frontend.json' },
  tempDirName: '.stryker-tmp/customer-frontend',
  concurrency: 2,
  // The sibling Stryker configs use `.stryker-tmp/<project>` too. Without this,
  // a concurrent run's sandbox is copied into this one's and the copy races with
  // its cleanup (ENOENT on copyfile). Nx/build caches are also pure dead weight
  // in the sandbox.
  ignorePatterns: ['/.stryker-tmp', '/coverage', '/dist', '/.nx', '/.angular', '/reports'],
  // A full-suite rerun per mutant is ~25-40s; the 5s default would time out.
  timeoutMS: 180000,
  timeoutFactor: 2,
  mutate: [
    'apps/customer-frontend/src/**/*.ts',
    '!apps/customer-frontend/src/**/*.spec.ts',
    // Bootstrap, SSR entry points and composition roots: no behaviour of their
    // own to kill, and none of them are exercised by the unit suite.
    '!apps/customer-frontend/src/main.ts',
    '!apps/customer-frontend/src/main.server.ts',
    '!apps/customer-frontend/src/server.ts',
    '!apps/customer-frontend/src/test-setup.ts',
    '!apps/customer-frontend/src/environments/**',
    '!apps/customer-frontend/src/app/app.config.ts',
    '!apps/customer-frontend/src/app/app.config.server.ts',
    '!apps/customer-frontend/src/app/app.routes.server.ts',
  ],
};
