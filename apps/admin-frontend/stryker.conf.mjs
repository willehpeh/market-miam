/**
 * Mutation testing for admin-frontend.
 *
 * Driven by the standalone `apps/admin-frontend/vitest.config.mts`, which
 * reproduces `nx test admin-frontend` (2 spec files / 2 tests) without the
 * `@angular/build:unit-test` executor. See tools/vitest/angular-jit.mts.
 *
 * The suite here is two smoke tests, so expect a low mutation score — this
 * config exists so that score is visible rather than assumed.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: {
    configFile: 'apps/admin-frontend/vitest.config.mts',
  },
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/admin-frontend.html' },
  jsonReporter: { fileName: 'reports/mutation/admin-frontend.json' },
  tempDirName: '.stryker-tmp/admin-frontend',
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
    'apps/admin-frontend/src/**/*.ts',
    '!apps/admin-frontend/src/**/*.spec.ts',
    // Bootstrap and composition roots: no behaviour of their own to kill.
    '!apps/admin-frontend/src/main.ts',
    '!apps/admin-frontend/src/app/app.config.ts',
  ],
};
