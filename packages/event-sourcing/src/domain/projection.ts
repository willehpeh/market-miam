import { EventHandler } from '../ports/event-handler';

// An interface, deliberately: as a class this could carry a default `reset()`, and a
// subclass that forgot to override it inherited a silent no-op — a rebuild that
// replayed onto an uncleared read model and reported success. An interface cannot
// carry an implementation, so every projection has to say what a rebuild means for
// it. "Nothing to clear" stays a legitimate answer; it just has to be written down.
export interface Projection extends EventHandler {
  // Tear down this projection's read model so a replay rebuilds it from zero.
  reset(): Promise<void>;
}
