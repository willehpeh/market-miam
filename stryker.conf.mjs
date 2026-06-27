/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: {
    configFile: 'test/vitest.config.mts',
  },
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  concurrency: 8,
  // Mutate the production code under packages/. The specs that kill these
  // mutants live in the `test` project, not under packages/, so there are no
  // spec/test files here to exclude.
  mutate: [
    'packages/**/src/**/*.ts',
    '!packages/**/src/index.ts',
    // Error classes are trivial message holders; tests assert the error *type*,
    // not the message text, so their string mutants are noise by design.
    '!packages/**/*.error.ts',
  ],
};
