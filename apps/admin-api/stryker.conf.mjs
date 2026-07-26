/**
 * Mutation testing for the admin-api app.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: {
    configFile: 'apps/admin-api/vitest.config.mts',
  },
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/admin-api.html' },
  jsonReporter: { fileName: 'reports/mutation/admin-api.json' },
  tempDirName: '.stryker-tmp/admin-api',
  concurrency: 2,
  mutate: [
    'apps/admin-api/src/**/*.ts',
    '!apps/admin-api/src/**/*.spec.ts',
    '!apps/admin-api/src/main.ts',
    '!apps/admin-api/src/app/**/*.module.ts',
    '!apps/admin-api/src/app/testing/**',
    '!apps/admin-api/src/**/*.error.ts',
  ],
};
