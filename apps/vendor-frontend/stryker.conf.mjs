/**
 * Mutation testing for vendor-frontend.
 *
 * Driven by the standalone `apps/vendor-frontend/vitest.config.mts`, which
 * reproduces `nx test vendor-frontend` (22 spec files / 176 tests) without the
 * `@angular/build:unit-test` executor — Stryker's Vitest runner needs a config
 * file on disk. Angular runs in JIT mode there; see tools/vitest/angular-jit.mts.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: {
    configFile: 'apps/vendor-frontend/vitest.config.mts',
  },
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/vendor-frontend.html' },
  jsonReporter: { fileName: 'reports/mutation/vendor-frontend.json' },
  tempDirName: '.stryker-tmp/vendor-frontend',
  concurrency: 2,
  // The sibling Stryker configs use `.stryker-tmp/<project>` too. Without this,
  // a concurrent run's sandbox is copied into this one's and the copy races with
  // its cleanup (ENOENT on copyfile). Nx/build caches are also pure dead weight
  // in the sandbox.
  ignorePatterns: ['/.stryker-tmp', '/coverage', '/dist', '/.nx', '/.angular', '/reports'],
  // jsdom + Angular JIT is slow to warm a fresh worker, and the mutants Stryker
  // has to cover with the whole suite (NgRx action strings and initial state are
  // evaluated at import time) get a per-mutant budget derived from the dry run.
  // The 5s default produces false "timed out" verdicts on a loaded machine.
  timeoutMS: 30000,
  timeoutFactor: 2,
  mutate: [
    'apps/vendor-frontend/src/**/*.ts',
    '!apps/vendor-frontend/src/**/*.spec.ts',
    // Bootstrap and composition roots: no behaviour of their own to kill.
    '!apps/vendor-frontend/src/main.ts',
    '!apps/vendor-frontend/src/test-setup.ts',
    '!apps/vendor-frontend/src/environments/**',
    '!apps/vendor-frontend/src/app/app.config.ts',
    '!apps/vendor-frontend/src/app/**/*.providers.ts',
    // Test doubles, not production code.
    '!apps/vendor-frontend/src/app/**/fake.*.ts',
  ],
};
