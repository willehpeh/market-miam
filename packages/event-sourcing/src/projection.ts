import { EventHandler } from './event-handler';

export abstract class Projection extends EventHandler {
  // Tear down this projection's read model so a replay rebuilds it from zero.
  // Default: nothing durable to clear (a purely in-memory computed projection).
  reset(): Promise<void> {
    return Promise.resolve();
  }
}
