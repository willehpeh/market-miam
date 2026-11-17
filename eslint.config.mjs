import nx from '@nx/eslint-plugin';
import { checkpointDecoratorRule } from './eslint-rules/checkpoint-decorator.mjs';
import { noAccessorsRule } from './eslint-rules/no-accessors.mjs';

const LIBRARY_TYPES = ['type:util', 'type:platform', 'type:kernel', 'type:auth', 'type:context'];
const TEST_FILES = ['**/*.spec.ts', '**/*.scenario.ts', '**/*.tenant.ts', '**/testing/**'];

const dependencyRules = ({ appsMayUseTheTestProject }) => [
  { sourceTag: 'scope:client', onlyDependOnLibsWithTags: ['scope:client', 'scope:shared'] },
  { sourceTag: 'scope:server', onlyDependOnLibsWithTags: ['scope:server', 'scope:shared'] },
  { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
  { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:util'] },
  { sourceTag: 'type:platform', onlyDependOnLibsWithTags: ['type:util'] },
  { sourceTag: 'type:kernel', onlyDependOnLibsWithTags: ['type:util', 'type:platform'] },
  { sourceTag: 'type:auth', onlyDependOnLibsWithTags: ['type:util', 'type:kernel', 'type:auth'] },
  { sourceTag: 'type:context', onlyDependOnLibsWithTags: ['type:util', 'type:platform', 'type:kernel'] },
  { sourceTag: 'type:testing', onlyDependOnLibsWithTags: [...LIBRARY_TYPES, 'type:testing'] },
  {
    sourceTag: 'type:app',
    onlyDependOnLibsWithTags: appsMayUseTheTestProject ? [...LIBRARY_TYPES, 'type:testing'] : LIBRARY_TYPES,
  },
];

const moduleBoundaries = ({ appsMayUseTheTestProject }) => [
  'error',
  {
    enforceBuildableLibDependency: true,
    allow: [
      '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
      // The custom rule module lives at the workspace root so both the
      // flat config and its spec (test project) can import it.
      '^.*/eslint-rules/.*$',
      // The design system is CSS and fonts, not an Nx project; the showcase
      // reads its source as text to render the tokens.
      '^.*/packages/design-system/.*$',
    ],
    depConstraints: dependencyRules({ appsMayUseTheTestProject }),
  },
];

export const domainObjectsExposeNoAccessors = {
  files: ['**/*.ts'],
  ignores: TEST_FILES,
  plugins: { domain: { rules: { 'no-accessors': noAccessorsRule } } },
  rules: { 'domain/no-accessors': 'error' },
};

const eventSourcingConventions = {
  rules: {
    'projection-decorator': checkpointDecoratorRule(['Projection', 'ProjectionFor'], 'CheckpointedProjection'),
    'processor-decorator': checkpointDecoratorRule(['Processor'], 'CheckpointedProcessor'),
  },
};

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*', '**/.astro'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': moduleBoundaries({ appsMayUseTheTestProject: true }),
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ignores: TEST_FILES,
    rules: {
      '@nx/enforce-module-boundaries': moduleBoundaries({ appsMayUseTheTestProject: false }),
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.ts'],
    plugins: { 'event-sourcing': eventSourcingConventions },
    rules: {
      'event-sourcing/projection-decorator': 'error',
      'event-sourcing/processor-decorator': 'error',
    },
  },
  // A raw startActiveSpan skips the span failure protocol silently: the span
  // never ends (so never exports) and errors pass through unrecorded. traced()
  // in with-span.ts is the only door to a work-wrapping span; marker spans
  // (startSpan + immediate end) are unaffected.
  {
    files: ['**/*.ts'],
    ignores: ['**/adapters/with-span.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='startActiveSpan']",
          message:
            'startActiveSpan bypasses the span failure protocol; open work-wrapping spans with traced() from @market-miam/event-sourcing.',
        },
      ],
    },
  },
  // W1 was a dropped promise (async callback inside forEach) that turned a failed
  // INSERT into a silent success. Type-aware linting catches that class at compile time.
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
];
