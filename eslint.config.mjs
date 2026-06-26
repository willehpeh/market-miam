import nx from '@nx/eslint-plugin';

// A projection/processor only runs if the ConsumerRunner discovers it by its
// @Checkpointed* decorator. A concrete handler missing the decorator silently
// never runs, and at runtime it's undetectable (handlers only `implements` their
// interface, so no instanceof). So enforce interface <-> decorator at lint time,
// keyed on the `implements` clause — the structural truth, not the class name.
// Abstract base classes are skipped; interfaces are never ClassDeclarations.
function checkpointDecoratorRule(interfaceName, decoratorName) {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: `Concrete classes implementing ${interfaceName} must carry @${decoratorName}, and vice versa.`,
      },
      schema: [],
    },
    create(context) {
      return {
        ClassDeclaration(node) {
          if (node.abstract || !node.id) {
            return;
          }
          const implementsInterface = (node.implements ?? []).some(
            (clause) => clause.expression?.name === interfaceName,
          );
          const decorated = (node.decorators ?? []).some(
            (decorator) =>
              decorator.expression?.type === 'CallExpression' &&
              decorator.expression.callee?.name === decoratorName,
          );
          if (implementsInterface && !decorated) {
            context.report({
              node: node.id,
              message: `A class implementing ${interfaceName} must be annotated with @${decoratorName} so the ConsumerRunner discovers it.`,
            });
          }
          if (decorated && !implementsInterface) {
            context.report({
              node: node.id,
              message: `A @${decoratorName} class must implement ${interfaceName}.`,
            });
          }
        },
      };
    },
  };
}

const eventSourcingConventions = {
  rules: {
    'projection-decorator': checkpointDecoratorRule('Projection', 'CheckpointedProjection'),
    'processor-decorator': checkpointDecoratorRule('Processor', 'CheckpointedProcessor'),
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
