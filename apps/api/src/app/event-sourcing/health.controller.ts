import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Subscriptions } from './subscriptions';

// The stuck-subscription pager without a Honeycomb trigger slot (O11Y-PLAN step 5): an
// external uptime monitor polls this route and pages on 503. The policy the trigger's
// query would have carried lives here instead — the recorded cost is that changing it
// now takes a deploy, not a query edit. Open on purpose: it serves subscription names
// and counts, nothing more.
const STUCK_AFTER = 5;

@Controller('health')
export class HealthController {
  constructor(private readonly subscriptions: Subscriptions) {}

  // Only a stuck processor pages — its side effects are lost until someone acts. A
  // lagging projection means stale reads and rides along in the body as the warn half.
  @Get()
  health(): { status: string; subscriptions: unknown[] } {
    const subscriptions = this.subscriptions.status();
    const stuck = subscriptions.some(
      (subscription) => subscription.kind === 'processor' && subscription.consecutiveFailures > STUCK_AFTER,
    );
    if (stuck) {
      throw new ServiceUnavailableException({ status: 'stuck', subscriptions });
    }
    return { status: 'ok', subscriptions };
  }
}
