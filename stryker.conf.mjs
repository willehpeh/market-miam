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
    // Container-only Postgres adapters are deliberately outside the mutation
    // net: Stryker runs the fast suite, and these files' correctness instrument
    // is the container contract suite in CI. Excluding them keeps the score
    // meaning "how well does the fast suite own the code it claims" instead of
    // being dominated by no-coverage mutants that measure a decision, not a
    // defect. Postgres-dir files WITH fast specs (postgres.notifications,
    // postgres.unit-of-work, master-keyring) stay in the net — add a fast spec
    // before removing a file from this list.
    '!packages/event-sourcing/src/adapters/postgres/postgres.checkpoint.ts',
    '!packages/event-sourcing/src/adapters/postgres/postgres.data-keys.ts',
    '!packages/event-sourcing/src/adapters/postgres/postgres.event-store.ts',
    '!packages/event-sourcing/src/adapters/postgres/serialized-append.ts',
    '!packages/market-days/src/**/postgres-*.ts',
  ],
  // Reporting colour bands only — no `break`, so a flaky or timing-sensitive
  // run cannot fail a build. The nightly workflow surfaces the score; gate it
  // only if the number proves stable.
  thresholds: { high: 90, low: 80 },
};
