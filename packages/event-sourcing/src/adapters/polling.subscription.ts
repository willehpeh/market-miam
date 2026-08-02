import { context, Span, trace } from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import { Checkpoint } from '../ports/checkpoint';
import { EventHandler } from '../ports/event-handler';
import { Events } from '../ports/events';
import { StoredEvent } from '../domain/stored-event';
import { Subscription } from '../ports/subscription';
import { UnitOfWork } from '../ports/unit-of-work';
import { withSpan } from './with-span';

const tracer = trace.getTracer('subscription');

const BATCH_SIZE = 100;

export class PollingSubscription implements Subscription {
  constructor(
    private readonly events: Events,
    private readonly handler: EventHandler,
    private readonly checkpoint: Checkpoint,
    private readonly unitOfWork: UnitOfWork = UnitOfWork.none(),
    private readonly name = 'subscription',
  ) {}

  // One span per polling cycle, and only one: an idle poll is two "is there anything
  // new?" queries whose auto-instrumented spans (pg, dns, tcp) outnumbered every other
  // span in production ~1000:1, each its own root trace because the poller runs outside
  // any request context. Suppression is context-wide, so the per-event handler span
  // lifts it again the moment a real event is found — the detail is only dropped when
  // nothing happened.
  poll(): Promise<void> {
    return tracer.startActiveSpan('subscription poll', { root: true }, (span: Span) => {
      span.setAttribute('subscription.name', this.name);
      return withSpan(span, 'subscription-poll-failed', () =>
        context.with(suppressTracing(context.active()), async () => {
          // Before the poll, not after: drain() empties the backlog before it
          // returns, so reading afterwards would always gauge zero and measure
          // nothing.
          await this.gauge(span);
          return this.drain();
        }),
      );
    });
  }

  private async drain(): Promise<void> {
    let batch: StoredEvent[];
    do {
      let position = await this.checkpoint.read();
      batch = await this.events.loadFrom(position, BATCH_SIZE);
      for (const event of batch) {
        // handle + checkpoint commit atomically: a throw rolls both back, so a poison
        // event never advances the checkpoint and replays forever (Subscriptions'
        // backoff only slows it). Per-event dead-lettering — retry K times, then record
        // the event and write the checkpoint past it — needs a durable attempt count,
        // so it lands with Postgres, not in-memory.
        // The advance is compare-and-set from the position this loop last saw
        // (ADR 0036): if a concurrent writer — another instance, or a rebuild's
        // reset — moved the checkpoint since, the conflict aborts the transaction,
        // this batch's remaining (possibly stale) events never land, and the retry
        // re-reads the checkpoint wherever it actually is.
        await this.unitOfWork.transaction(async () => {
          if (this.handler.eventTypes().includes(event.type)) {
            await this.handler.handle(event);
          }
          await this.checkpoint.advance(position, event.globalPosition);
        });
        position = event.globalPosition;
      }
    } while (batch.length === BATCH_SIZE);
  }

  private async gauge(span: Span): Promise<void> {
    try {
      // Checkpoint before head: both only advance, so reading the consumer's
      // position first cannot make it look ahead of a log read later.
      const position = await this.checkpoint.read();
      span.setAttribute('subscription.lag', (await this.events.head()) - position);
    } catch {
      // A measurement that takes down the thing it measures is worse than no
      // measurement — losing the gauge for a cycle is the cheaper failure.
      span.setAttribute('subscription.lag_unavailable', true);
    }
  }
}
