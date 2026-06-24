import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Hermetic span capture: a test-only provider with an in-memory exporter,
// registered once (the global provider is set-once per process). No auto-
// instrumentation, so getFinishedSpans() holds only spans our code creates.
// SimpleSpanProcessor exports synchronously on span end — no flush race.
// Call once at module scope (vitest isolates per file); reset() between tests.
export function registerSpanCapture(): InMemorySpanExporter {
  const exporter = new InMemorySpanExporter();
  new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  }).register();
  return exporter;
}
