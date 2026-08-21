import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Subscriptions, SubscriptionStatus } from './subscriptions';

// The stuck-subscription pager without a Honeycomb trigger slot (O11Y-PLAN step 5): an
// external uptime monitor polls this route and pages on 503. The policy the trigger's
// query would have carried lives here instead — the recorded cost is that changing it
// now takes a deploy, not a query edit. Open on purpose: it serves subscription names
// and counts, nothing more.
const STUCK_AFTER = 5;

// Silence is the other way a subscription dies, and the count above cannot see it: a poll
// that hangs never rejects, so it never retries and never increments (ADR 0050). Today
// every await inside a poll is a pg query and the pool's query_timeout turns a hang into
// a failure within 10s — but that is an invariant of the pool config, not of this route,
// and the first non-pg await in a handler would break it silently. Elapsed time holds
// regardless of what the poll is waiting on.
//
// The threshold's one real constraint is that it clears PollSchedule's 5-minute backstop
// with room for a whole poll on top: a consumer with no pokes at all still wakes on the
// timer, so anything at or under that interval would report merely idle as wedged.
const SILENT_AFTER_SECONDS = 900;

@Controller('health')
export class HealthController {
  constructor(private readonly subscriptions: Subscriptions) {}

  // Only a stuck processor pages — its side effects are lost until someone acts. A
  // lagging projection means stale reads and rides along in the body as the warn half.
  @Get()
  health(): { status: string; subscriptions: unknown[] } {
    const subscriptions = this.subscriptions.status();
    const stuck = subscriptions.some(
      (subscription) => subscription.kind === 'processor' && wedged(subscription),
    );
    if (stuck) {
      throw new ServiceUnavailableException({ status: 'stuck', subscriptions });
    }
    return { status: 'ok', subscriptions };
  }
}

// Failing loudly and having gone quiet are the same outcome — the events are not being
// processed — so they share one verdict rather than two statuses nobody would treat
// differently.
function wedged(subscription: SubscriptionStatus): boolean {
  return (
    subscription.consecutiveFailures > STUCK_AFTER ||
    subscription.secondsSinceLastPoll > SILENT_AFTER_SECONDS
  );
}
