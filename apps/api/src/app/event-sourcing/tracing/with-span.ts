import { Span, SpanStatusCode } from '@opentelemetry/api';

// The one span failure protocol: run the work; on a throw mark the span (a stable
// exception.slug for alerting, the recorded exception, ERROR status) and rethrow;
// always end the span. Call sites own startActiveSpan — its name, options, context —
// and their attributes; only this choreography lives here, once.
export async function withSpan<R>(span: Span, slug: string, work: () => Promise<R>): Promise<R> {
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
