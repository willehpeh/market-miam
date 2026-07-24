import { context, Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import { Subscription } from '@market-miam/event-sourcing';

const tracer = trace.getTracer('subscription');

// One span per polling cycle, and only one: an idle poll is two "is there anything
// new?" queries whose auto-instrumented spans (pg, dns, tcp) outnumbered every other
// span in production ~1000:1, each its own root trace because the poller runs outside
// any request context. Suppression is context-wide, so TracingEventHandler lifts it
// again the moment a real event is found — the detail is only dropped when nothing
// happened.
export class TracingSubscription implements Subscription {
  constructor(private readonly inner: Subscription, private readonly name: string) {}

  poll(): Promise<void> {
    return tracer.startActiveSpan(
      'subscription poll',
      { root: true },
      async (span: Span) => {
        span.setAttribute('subscription.name', this.name);
        try {
          return await context.with(suppressTracing(context.active()), () => this.inner.poll());
        } catch (error) {
          span.setAttribute('exception.slug', 'subscription-poll-failed');
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
