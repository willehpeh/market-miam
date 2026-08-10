import { Context, Span, SpanOptions, SpanStatusCode, Tracer } from '@opentelemetry/api';

// The one span failure protocol: start the span, run the work; on a throw mark the
// span (a stable exception.slug for alerting, the recorded exception, ERROR status)
// and rethrow; always end the span. Call sites own the span's name, options, context
// and their attributes — passed in, not owned here — but they cannot skip the
// choreography: traced() is the only way to open a work-wrapping span (a lint rule
// restricts raw startActiveSpan to this file), because a forgotten protocol is
// silent — the span never ends, never exports, and errors pass through unrecorded.
// Marker spans (startSpan + immediate end, no work to fail) stay outside this door.

type TracedWork<R> = (span: Span) => Promise<R>;

export function traced<R>(tracer: Tracer, name: string, slug: string, work: TracedWork<R>): Promise<R>;
export function traced<R>(tracer: Tracer, name: string, slug: string, options: SpanOptions, work: TracedWork<R>): Promise<R>;
export function traced<R>(
  tracer: Tracer,
  name: string,
  slug: string,
  options: SpanOptions,
  ctx: Context,
  work: TracedWork<R>,
): Promise<R>;
export function traced<R>(
  tracer: Tracer,
  name: string,
  slug: string,
  ...rest: [TracedWork<R>] | [SpanOptions, TracedWork<R>] | [SpanOptions, Context, TracedWork<R>]
): Promise<R> {
  const work = rest[rest.length - 1] as TracedWork<R>;
  const run = (span: Span) => withSpan(span, slug, () => work(span));
  if (rest.length === 3) {
    return tracer.startActiveSpan(name, rest[0], rest[1] as Context, run);
  }
  if (rest.length === 2) {
    return tracer.startActiveSpan(name, rest[0] as SpanOptions, run);
  }
  return tracer.startActiveSpan(name, run);
}

async function withSpan<R>(span: Span, slug: string, work: () => Promise<R>): Promise<R> {
  try {
    return await work();
  } catch (error) {
    span.setAttribute('exception.slug', slug);
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
