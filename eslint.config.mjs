import nx from '@nx/eslint-plugin';
import { checkpointDecoratorRule } from './eslint-rules/checkpoint-decorator.mjs';

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
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            // The custom rule module lives at the workspace root so both the
            // flat config and its spec (test project) can import it.
            '^.*/eslint-rules/.*$',
          ],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
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
