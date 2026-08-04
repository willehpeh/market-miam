import type { Rule } from 'eslint';

export function checkpointDecoratorRule(
  interfaceNames: string[],
  decoratorName: string,
): Rule.RuleModule;
