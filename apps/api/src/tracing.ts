/**
 * OpenTelemetry bootstrap (ADR 0026).
 *
 * Imported as the very first statement of `main.ts` so the SDK installs its
 * module-patching hooks before any instrumented library (@nestjs, express,
 * http, pg, ...) is required. Webpack externalises third-party deps
 * (`generatePackageJson`), so auto-instrumentation can patch them at runtime.
 *
 * Configuration is by environment (set in render.yaml / dashboard):
 *   OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT,
 *   OTEL_EXPORTER_OTLP_HEADERS, OTEL_EXPORTER_OTLP_PROTOCOL.
 * The exporter reads endpoint + headers from those vars directly.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// RENDER_GIT_COMMIT is injected by Render at build and runtime; absent locally.
// Stamped as a resource attribute for per-deploy comparison in Honeycomb.


const sdk = new NodeSDK({
  resource: resourceWithAttributes(),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Flush pending spans before the process exits (Render sends SIGTERM on
// deploy/restart). Without this the final spans of a request are lost.
const shutdown = () => {
  sdk
    .shutdown()
    .catch((err) => console.error('OpenTelemetry shutdown failed', err))
    .finally(() => process.exit(0));
};

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

function gitCommitInfo() {
  const gitCommit = process.env.RENDER_GIT_COMMIT;
  return gitCommit
    ? { [ATTR_SERVICE_VERSION]: gitCommit, 'render.git_commit': gitCommit }
    : {};
}

function resourceWithAttributes() {
  return defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'api',
      ...gitCommitInfo()
    })
  );
}
