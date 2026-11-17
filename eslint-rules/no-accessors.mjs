export const noAccessorsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Domain objects expose no getters or setters (ADR 0008).',
    },
    schema: [],
  },
  create(context) {
    return {
      MethodDefinition(node) {
        if (node.kind === 'get' || node.kind === 'set') {
          context.report({
            node: node.key,
            message:
              'No getters or setters (ADR 0008): offer behaviour, or an explicit value() or snapshot() where data must cross a boundary.',
          });
        }
      },
    };
  },
};
