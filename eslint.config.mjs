import nx from '@nx/eslint-plugin';

// A projection is only run if the ConsumerRunner discovers it, which it does by
// the @CheckpointedProjection decorator. A concrete *Projection class without it
// silently never runs — and at runtime it's undetectable (projections only
// `implements Projection`, so no instanceof). So enforce name <-> decorator at
// lint time. Abstract classes are skipped; interfaces are never ClassDeclarations.
const eventSourcingConventions = {
  rules: {
    'projection-decorator': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Concrete *Projection classes must carry @CheckpointedProjection, and vice versa.',
        },
        schema: [],
      },
      create(context) {
        return {
          ClassDeclaration(node) {
            if (node.abstract || !node.id) {
              return;
            }
            const named = node.id.name.endsWith('Projection');
            const decorated = (node.decorators ?? []).some(
              (decorator) =>
                decorator.expression?.type === 'CallExpression' &&
                decorator.expression.callee?.name === 'CheckpointedProjection',
            );
            if (named && !decorated) {
              context.report({
                node: node.id,
                message:
                  'A concrete *Projection class must be annotated with @CheckpointedProjection so the ConsumerRunner discovers it.',
              });
            }
            if (decorated && !named) {
              context.report({
                node: node.id,
                message: 'A @CheckpointedProjection class must be named with the Projection suffix.',
              });
            }
          },
        };
      },
    },
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
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
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
    rules: { 'event-sourcing/projection-decorator': 'error' },
  },
];
