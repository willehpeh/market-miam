import nx from '@nx/eslint-plugin';

// A projection/processor only runs if the ConsumerRunner discovers it by its
// @Checkpointed* decorator. A concrete handler missing the decorator silently
// never runs, and at runtime it's undetectable (handlers relate to their base
// only structurally, so no reliable instanceof). So enforce base <-> decorator
// at lint time, matching any of the base names in an `extends` superclass (real
// projections extend ProjectionFor) or an `implements` clause (Projection and
// Processor are bare markers) — the structural truth, not the class name.
// Abstract base classes are skipped.
function checkpointDecoratorRule(interfaceNames, decoratorName) {
  const relation = interfaceNames.join(' or ');
  return {
    meta: {
      type: 'problem',
      docs: {
        description: `Concrete ${relation} classes must carry @${decoratorName}, and vice versa.`,
      },
      schema: [],
    },
    create(context) {
      return {
        ClassDeclaration(node) {
          if (node.abstract || !node.id) {
            return;
          }
          const relatesToBase =
            interfaceNames.includes(node.superClass?.name) ||
            (node.implements ?? []).some((clause) => interfaceNames.includes(clause.expression?.name));
          const decorated = (node.decorators ?? []).some(
            (decorator) =>
              decorator.expression?.type === 'CallExpression' &&
              decorator.expression.callee?.name === decoratorName,
          );
          if (relatesToBase && !decorated) {
            context.report({
              node: node.id,
              message: `A class extending or implementing ${relation} must be annotated with @${decoratorName} so the ConsumerRunner discovers it.`,
            });
          }
          if (decorated && !relatesToBase) {
            context.report({
              node: node.id,
              message: `A @${decoratorName} class must extend or implement ${relation}.`,
            });
          }
        },
      };
    },
  };
}

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
    rules: {
      'event-sourcing/projection-decorator': 'error',
      'event-sourcing/processor-decorator': 'error',
    },
  },
];
