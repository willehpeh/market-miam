/**
 * Mutation testing for the api app's own code (Nest adapters, projections,
 * consumers). The domain under packages/ is covered by the root config.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: {
    configFile: 'apps/api/vitest.config.mts',
  },
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/api.html' },
  jsonReporter: { fileName: 'reports/mutation/api.json' },
  tempDirName: '.stryker-tmp/api',
  concurrency: 4,
  mutate: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.spec.ts',
    // Bootstrap and composition roots: no behaviour of their own to kill.
    '!apps/api/src/main.ts',
    '!apps/api/src/tracing.ts',
    '!apps/api/src/app/app.module.ts',
    '!apps/api/src/app/**/*.module.ts',
    // Test harness, not production code.
    '!apps/api/src/app/testing/**',
    // Error classes are trivial message holders; tests assert the error *type*.
    '!apps/api/src/**/*.error.ts',
  ],
};
