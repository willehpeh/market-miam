// A projection/processor only runs if Subscriptions discovers it by its
// @Checkpointed* decorator. A concrete handler missing the decorator silently
// never runs, and at runtime it's undetectable (handlers relate to their base
// only structurally, so no reliable instanceof). So report any concrete class
// that names a checkpointed base — in an `extends` superclass (real projections
// extend ProjectionFor) or an `implements` clause (Projection and Processor are
// bare markers) — but carries no decorator. Abstract base classes are skipped.
//
// One direction only, deliberately: the reverse (decorated but not satisfying
// the interface) is owned by the decorator's constrained signature in
// checkpointed.decorator.ts, where the compiler checks structure instead of
// this rule's name matching.
export function checkpointDecoratorRule(interfaceNames, decoratorName) {
  const relation = interfaceNames.join(' or ');
  return {
    meta: {
      type: 'problem',
      docs: {
        description: `Concrete ${relation} classes must carry @${decoratorName} to be discovered.`,
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
              message: `A class extending or implementing ${relation} must be annotated with @${decoratorName} so Subscriptions discovers it.`,
            });
          }
        },
      };
    },
  };
}
