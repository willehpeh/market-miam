import { isSpanContextValid, Link, Span, SpanContext } from '@opentelemetry/api';

// The one place that knows the W3C traceparent format. Serialize and parse are
// deliberately asymmetric: parse is tell-shaped (producerLinks returns the links
// array the span options want — empty for absent/malformed/invalid, so callers
// never branch), while serialize keeps its optional — the store's metadata merge
// must distinguish "nothing to write" to stay a faithful EventStore, and that
// rule belongs to the store, not to the format.

// With no SDK registered the tracer is a no-op whose spans carry the W3C
// invalid all-zero context — not a trace id to persist into the log.
export function traceparentOf(span: Span): string | undefined {
  const { traceId, spanId, traceFlags } = span.spanContext();
  if (!isSpanContextValid(span.spanContext())) {
    return undefined;
  }
  return `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
}

export function producerLinks(metadata?: Record<string, unknown>): Link[] {
  const producer = producerContextOf(metadata);
  return producer ? [{ context: producer }] : [];
}

function producerContextOf(metadata?: Record<string, unknown>): SpanContext | undefined {
  const traceparent = metadata?.['traceparent'];
  if (typeof traceparent !== 'string') {
    return undefined;
  }
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(traceparent);
  if (!match) {
    return undefined;
  }
  const [, traceId, spanId, flags] = match;
  const producer: SpanContext = { traceId, spanId, traceFlags: parseInt(flags, 16), isRemote: true };
  // All-zero ids are well-formed but invalid per W3C — degrade to no link,
  // same as a malformed traceparent.
  return isSpanContextValid(producer) ? producer : undefined;
}
