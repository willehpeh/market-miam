import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { noAccessorsRule } from '../../eslint-rules/no-accessors.mjs';

function lint(code: string): Linter.LintMessage[] {
  return new Linter().verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tseslint.parser as Linter.Parser },
      plugins: { domain: { rules: { 'no-accessors': noAccessorsRule } } },
      rules: { 'domain/no-accessors': 'error' },
    },
    'price.ts',
  );
}

describe('no accessors lint rule', () => {
  it('reports a getter, pointing at ADR 0008', () => {
    const messages = lint(`
      class Price {
        get amount(): number { return 1; }
      }
    `);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('ADR 0008');
  });

  it('reports a setter', () => {
    const messages = lint(`
      class Price {
        set amount(value: number) {}
      }
    `);

    expect(messages).toHaveLength(1);
  });

  it('stays silent on an explicit value() method, which ADR 0008 allows', () => {
    const messages = lint(`
      class Price {
        value(): number { return 1; }
      }
    `);

    expect(messages).toEqual([]);
  });
});
