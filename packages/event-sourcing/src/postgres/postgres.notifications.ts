import type { Client } from 'pg';
import { Observable, Subject } from 'rxjs';

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
// Framework-free by design: the connection lifecycle is driven by start()/stop(),
// and state transitions are published on status() rather than logged/traced here.
// A host wraps this to add lifecycle wiring, logging, and tracing (see apps/api's
// TracingPostgresNotifications).
//
// ponytail: hand-rolled LISTEN + reconnect. `pg-listen` covers the same ground;
// reach for it only if this grows past reconnect + a single channel.
export class PostgresNotifications {
  private readonly pokes = new Subject<void>();
  private readonly statuses = new Subject<ListenStatus>();
  private client?: Client;
  private stopped = false;
  private reconnecting = false;
  private attempt = 0;
  private timer?: ReturnType<typeof setTimeout>;

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
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    await this.discard(this.client);
    this.client = undefined;
  }

  private async connect(): Promise<void> {
    if (this.stopped) {
      return;
    }
    const client = this.newClient();
    client.on('notification', () => this.pokes.next());
    client.on('error', (error) => this.handleLoss(client, error));
    client.on('end', () => this.handleLoss(client, new Error('connection ended')));
    try {
      await client.connect();
      await client.query(`LISTEN ${CHANNEL}`);
    } catch (error) {
      this.handleLoss(client, error);
      return;
    }
    if (this.stopped) {
      await this.discard(client);
      return;
    }
    this.client = client;
    const reconnected = this.attempt > 0;
    this.mark(reconnected ? 'reconnected' : 'connected');
    this.attempt = 0;
    if (reconnected) {
      // Catch-up: events may have landed during the gap and produced no poke.
      this.pokes.next();
    }
  }

  private handleLoss(client: Client, error: unknown): void {
    if (this.stopped || this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    if (this.client === client) {
      this.client = undefined;
    }
    void this.discard(client);
    this.mark('dropped', error);
    const delay = Math.min(this.initialBackoffMs * 2 ** this.attempt, MAX_BACKOFF_MS);
    this.attempt++;
    this.timer = setTimeout(() => {
      this.reconnecting = false;
      void this.connect();
    }, delay);
  }

  private async discard(client?: Client): Promise<void> {
    if (!client) {
      return;
    }
    client.removeAllListeners();
    await client.end().catch(() => undefined);
  }

  private mark(state: ListenState, error?: unknown): void {
    this.statuses.next({ state, attempt: this.attempt, error });
  }
}
