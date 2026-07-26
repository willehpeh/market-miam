/**
 * Standalone Vitest support for the Angular apps.
 *
 * `nx test <app>` uses the `@angular/build:unit-test` executor, which builds the
 * app with esbuild/ngtsc and then drives Vitest over the in-memory bundle. That
 * pipeline has no Vitest config file on disk, so Stryker's `vitest` runner (which
 * requires `vitest.configFile`) cannot be pointed at it.
 *
 * These plugins reproduce the executor's test environment from the raw sources
 * instead:
 *
 *  - Angular runs in **JIT** mode. Vite's esbuild transform emits the
 *    `@Component`/`@Injectable` decorators as runtime calls (tsconfig.base.json
 *    sets `experimentalDecorators`), and importing `@angular/compiler` in the
 *    setup file lets Angular compile them — and the partial-ivy libraries
 *    (`@ngrx/*`, `@auth0/auth0-angular`, `@testing-library/angular`) — on the fly.
 *    No `emitDecoratorMetadata` is needed: every injection site uses `inject()`.
 *  - The TestBed is initialised exactly as the builder does it, see
 *    `createTestBedInitVirtualFile()` in
 *    `@angular/build/src/builders/unit-test/runners/vitest/build-options.js`:
 *    zoneless (no app declares `polyfills`), with `errorOnUnknownElements` and
 *    `errorOnUnknownProperties` enabled.
 *  - `templateUrl` / `styleUrl` are resolved at transform time, because the JIT
 *    compiler cannot fetch component resources synchronously.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vitest/config';

/** Setup-file specifier that boots `@angular/compiler` + the TestBed. */
export const ANGULAR_TESTBED_INIT = 'virtual:angular-testbed-init';

const RESOLVED_TESTBED_INIT = '\0' + ANGULAR_TESTBED_INIT;

/**
 * Serves the TestBed bootstrap as a virtual module so no extra file has to be
 * added to each app's `src/`.
 */
function angularTestBedInit(): Plugin {
  return {
    name: 'mm:angular-testbed-init',
    enforce: 'pre',
    resolveId(id) {
      return id === ANGULAR_TESTBED_INIT || id.endsWith(ANGULAR_TESTBED_INIT)
        ? RESOLVED_TESTBED_INIT
        : undefined;
    },
    load(id) {
      if (id !== RESOLVED_TESTBED_INIT) {
        return undefined;
      }

      // Plain JS: the virtual id has no extension, so esbuild treats it as
      // JavaScript and cannot transform TypeScript decorators here.
      return `
        import '@angular/compiler';
        import { getTestBed, ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';
        import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
        import { afterEach, beforeEach } from 'vitest';

        beforeEach(getCleanupHook(false));
        afterEach(getCleanupHook(true));

        const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
        if (!globalThis[ANGULAR_TESTBED_SETUP]) {
          globalThis[ANGULAR_TESTBED_SETUP] = true;

          getTestBed().initTestEnvironment([BrowserTestingModule], platformBrowserTesting(), {
            errorOnUnknownElements: true,
            errorOnUnknownProperties: true,
          });
        }
      `;
    },
  };
}

const STYLE_URL = /\bstyleUrls?\s*:\s*(\[[^\]]*\]|'[^']*'|"[^"]*"|`[^`]*`)\s*,?/g;
const TEMPLATE_URL = /\btemplateUrl\s*:\s*(['"])([^'"]+)\1\s*,?/g;

/**
 * Inlines `templateUrl` and drops `styleUrl`/`styleUrls`.
 *
 * The JIT compiler needs component resources to be inline; stylesheets are
 * irrelevant under jsdom (and would need a Sass compiler), so they are dropped.
 */
function inlineComponentResources(): Plugin {
  return {
    name: 'mm:inline-component-resources',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.ts') || !code.includes('@Component')) {
        return undefined;
      }
      if (!STYLE_URL.test(code) && !TEMPLATE_URL.test(code)) {
        STYLE_URL.lastIndex = TEMPLATE_URL.lastIndex = 0;
        return undefined;
      }
      STYLE_URL.lastIndex = TEMPLATE_URL.lastIndex = 0;

      const withoutStyles = code.replace(STYLE_URL, '');
      const inlined = withoutStyles.replace(TEMPLATE_URL, (_match, _quote, relative) => {
        const file = path.resolve(path.dirname(id), relative);
        this.addWatchFile(file);
        let html = '';
        try {
          html = readFileSync(file, 'utf-8');
        } catch {
          // A mutated `templateUrl` will not point at a real file. Fall back to an
          // empty template rather than failing the whole module load.
        }
        return `template: ${JSON.stringify(html)},`;
      });

      return inlined === code ? undefined : { code: inlined, map: null };
    },
  };
}

/**
 * Reproduces the `build:testing` configuration's `fileReplacements` entry, which
 * swaps `environments/environment.ts` for `environments/environment.testing.ts`
 * (empty `apiBaseUrl` so `HttpTestingController` matches relative paths).
 */
function testingEnvironment(projectRoot: string): Plugin {
  const replacement = path.join(projectRoot, 'src/environments/environment.testing.ts');
  const original = path.join('environments', 'environment.ts');

  return {
    name: 'mm:testing-environment',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!/(^|[\\/])environments[\\/]environment(\.ts)?$/.test(source)) {
        return undefined;
      }
      const resolved = await this.resolve(source, importer, options);
      if (!resolved) {
        return undefined;
      }
      return resolved.id.endsWith(original) ? replacement : resolved;
    },
  };
}

/**
 * @param projectRoot Absolute path to the app directory.
 * @param options.replaceEnvironment Pass `false` for apps with no
 *   `src/environments` directory (admin-frontend).
 */
export function angularJitPlugins(
  projectRoot: string,
  options: { replaceEnvironment?: boolean } = {},
): Plugin[] {
  const plugins = [angularTestBedInit(), inlineComponentResources()];
  if (options.replaceEnvironment !== false) {
    plugins.push(testingEnvironment(projectRoot));
  }
  return plugins;
}

/**
 * Resolve settings matching what the Angular Vitest runner configures, so the
 * FESM entry points of the Angular packages are picked up.
 */
export const angularJitResolve = {
  mainFields: ['es2020', 'module', 'main'],
  conditions: ['es2015', 'es2020', 'module'],
};
