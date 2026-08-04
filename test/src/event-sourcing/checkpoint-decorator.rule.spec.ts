import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { checkpointDecoratorRule } from '../../../eslint-rules/checkpoint-decorator.mjs';

// Pins the lint rule's one irreplaceable job: a concrete handler that implements
// a checkpointed base but forgot its @Checkpointed* decorator silently never
// runs — no compile error, no runtime error, data just stops flowing. The other
// direction (decorated but wrong shape) is owned by the decorator's constrained
// signature, so the rule must stay silent there.
function lintAsProjection(code: string): Linter.LintMessage[] {
  const linter = new Linter();
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tseslint.parser as Linter.Parser },
      plugins: {
        'event-sourcing': {
          rules: {
            'projection-decorator': checkpointDecoratorRule(
              ['Projection', 'ProjectionFor'],
              'CheckpointedProjection',
            ),
          },
        },
      },
      rules: { 'event-sourcing/projection-decorator': 'error' },
    },
    'storefront.projection.ts',
  );
}

describe('checkpoint decorator lint rule', () => {
  it('reports a concrete projection that forgot its decorator — it would silently never run', () => {
    const messages = lintAsProjection(`
      class StorefrontProjection implements Projection {
        eventTypes(): string[] { return []; }
        handle(): Promise<void> { return Promise.resolve(); }
        reset(): Promise<void> { return Promise.resolve(); }
      }
    `);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('@CheckpointedProjection');
  });

  it('reports an undecorated class extending a projection base', () => {
    const messages = lintAsProjection(`
      class CatalogueView extends ProjectionFor<CatalogueEvent> {
        protected handlers() { return {}; }
        reset(): Promise<void> { return Promise.resolve(); }
      }
    `);

    expect(messages).toHaveLength(1);
  });

  it('accepts a decorated projection', () => {
    const messages = lintAsProjection(`
      @CheckpointedProjection('storefront')
      class StorefrontProjection implements Projection {
        eventTypes(): string[] { return []; }
        handle(): Promise<void> { return Promise.resolve(); }
        reset(): Promise<void> { return Promise.resolve(); }
      }
    `);

    expect(messages).toHaveLength(0);
  });

  it('skips abstract bases — only concrete handlers are discoverable', () => {
    const messages = lintAsProjection(`
      abstract class ProjectionBase implements Projection {
        eventTypes(): string[] { return []; }
        handle(): Promise<void> { return Promise.resolve(); }
        abstract reset(): Promise<void>;
      }
    `);

    expect(messages).toHaveLength(0);
  });

  it('stays silent on a decorated class that names no projection base — the compiler owns that direction', () => {
    const messages = lintAsProjection(`
      @CheckpointedProjection('storefront')
      class StorefrontProjection extends SomeNewProjectionBase {
        reset(): Promise<void> { return Promise.resolve(); }
      }
    `);

    expect(messages).toHaveLength(0);
  });
});
