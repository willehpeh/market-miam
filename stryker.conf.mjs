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
  // Mutate the production code under packages/, never the spec/test sources
  // (those live in the `test` project and are the *killers*, not the targets).
  // This mirrors the coverage `include` in test/vitest.config.mts.
  mutate: [
    'packages/**/src/**/*.ts',
    '!packages/**/src/index.ts',
    '!packages/**/*.spec.ts',
    '!packages/**/*.test.ts',
  ],
};
