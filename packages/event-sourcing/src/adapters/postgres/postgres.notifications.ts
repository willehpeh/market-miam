import type { Client } from 'pg';
import { Observable, ReplaySubject, Subject } from 'rxjs';

const CHANNEL = 'events';
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export type ListenState = 'connected' | 'dropped' | 'reconnected';

export interface ListenStatus {
  state: ListenState;
  attempt: number;
  error?: unknown;
}

// One long-lived pg connection running `LISTEN events`, exposed as a poke stream.
// A poke means "poll now"; the runner's timer is the backstop for any poke missed
// while this is reconnecting — so the LISTEN-down window is what we watch (via the
// status stream), not individual events.
//
// Single-use: one start(), one stop(), one lifetime per instance — a restart is a
// new instance. start() rejects if the first connection cannot be established and
// schedules nothing: boot decides, so a permanently misconfigured LISTEN
// connection fails the deploy instead of surfacing as minutes of read-model lag.
// Losses after a successful start reconnect with capped exponential backoff.
// stop() completes both streams — subscribers get their terminal event.
//
// Framework-free by design: the connection lifecycle is driven by start()/stop(),
// and state transitions are published on status() rather than logged/traced here.
// A host wraps this to add lifecycle wiring, logging, and tracing (see apps/api's
// TracingPostgresNotifications).
//
// ponytail: hand-rolled LISTEN + reconnect. `pg-listen` covers the same ground;
// reach for it only if this grows past reconnect + a single channel.
export class PostgresNotifications {
  private readonly pokes = new Subject<void>();
  // ReplaySubject(1), not Subject: a host that subscribes after start() still gets
  // the current status (no seed value to invent, unlike BehaviorSubject). Pokes stay
  // a plain Subject — a stale "poll now" must not replay to a late subscriber.
  private readonly statuses = new ReplaySubject<ListenStatus>(1);
  private connection?: ListeningConnection;
  private started = false;
  private stopped = false;
  private cancelDelay?: () => void;

  constructor(
    private readonly newClient: () => Client,
    private readonly initialBackoffMs: number = INITIAL_BACKOFF_MS,
  ) {}

  notifications(): Observable<void> {
    return this.pokes.asObservable();
  }

  status(): Observable<ListenStatus> {
    return this.statuses.asObservable();
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('PostgresNotifications: start() called twice — instances are single-use');
    }
    this.started = true;
    this.connection = await this.open();
    this.mark('connected', 0);
    void this.supervise();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.cancelDelay?.();
    await this.connection?.close();
    this.connection = undefined;
    this.pokes.complete();
    this.statuses.complete();
  }

  // The whole reconnect story, linearly: await death, announce, back off, reopen,
  // announce, catch up, repeat. `attempt` is loop-local, so it cannot leak into
  // another connection's lifetime. Shutdown rides the same signal path as a
  // crash: close() settles `lost`, the loop wakes, sees stopped, and unwinds.
  private async supervise(): Promise<void> {
    while (!this.stopped && this.connection) {
      let cause = await this.connection.lost;
      for (let attempt = 1; !this.stopped; attempt++) {
        this.mark('dropped', attempt, cause);
        await this.delay(Math.min(this.initialBackoffMs * 2 ** (attempt - 1), MAX_BACKOFF_MS));
        if (this.stopped) {
          return;
        }
        try {
          const connection = await this.open();
          if (this.stopped) {
            await connection.close();
            return;
          }
          this.connection = connection;
          this.mark('reconnected', attempt);
          // Catch-up: events may have landed during the gap and produced no poke.
          this.pokes.next();
          break;
        } catch (error) {
          cause = error;
        }
      }
    }
  }

  private open(): Promise<ListeningConnection> {
    return ListeningConnection.open(this.newClient, () => this.pokes.next());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.cancelDelay = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  private mark(state: ListenState, attempt: number, error?: unknown): void {
    this.statuses.next({ state, attempt, error });
  }
}

// One LISTEN connection with its own lifetime: open() returns a fully wired,
// listening connection or throws — no half-connected object ever exists. Both pg
// failure events (error, end) settle the same `lost` promise, so the double-fire
// needs no debounce: a promise settles once.
class ListeningConnection {
  static async open(newClient: () => Client, onPoke: () => void): Promise<ListeningConnection> {
    const client = newClient();
    const connection = new ListeningConnection(client);
    client.on('notification', onPoke);
    client.on('error', (error) => connection.die(error));
    client.on('end', () => connection.die(new Error('connection ended')));
    try {
      await client.connect();
      await client.query(`LISTEN ${CHANNEL}`);
    } catch (error) {
      await connection.close();
      throw error;
    }
    return connection;
  }

  // Resolves exactly once with the cause of death; never rejects.
  readonly lost: Promise<unknown>;
  private die!: (cause: unknown) => void;

  private constructor(private readonly client: Client) {
    this.lost = new Promise((resolve) => {
      this.die = resolve;
    });
  }

  async close(): Promise<void> {
    this.client.removeAllListeners();
    this.die(new Error('connection closed'));
    await this.client.end().catch(() => undefined);
  }
}
