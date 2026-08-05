import { afterEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { PollSchedule } from './poll-schedule';

// The contract every profile composes against. Emissions mean "poll now";
// Subscriptions subscribes one pipeline per consumer to this stream.
describe('PollSchedule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pokes immediately on subscribe — the leading backstop tick', async () => {
    vi.useFakeTimers();
    let pokes = 0;
    const subscription = PollSchedule.pokedWithBackstop(new Subject<void>(), 30000)
      .pokes()
      .subscribe(() => pokes++);

    await vi.advanceTimersByTimeAsync(0);
    expect(pokes).toBe(1);
    subscription.unsubscribe();
  });

  it('keeps ticking at the backstop interval', async () => {
    vi.useFakeTimers();
    let pokes = 0;
    const subscription = PollSchedule.pokedWithBackstop(new Subject<void>(), 30000)
      .pokes()
      .subscribe(() => pokes++);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(30000);
    expect(pokes).toBe(2);
    subscription.unsubscribe();
  });

  it('passes a poke through without waiting for the backstop', async () => {
    vi.useFakeTimers();
    let pokes = 0;
    const source = new Subject<void>();
    const subscription = PollSchedule.pokedWithBackstop(source, 30000)
      .pokes()
      .subscribe(() => pokes++);
    await vi.advanceTimersByTimeAsync(0);

    source.next();
    expect(pokes).toBe(2); // leading tick + the poke, no timer advance needed
    subscription.unsubscribe();
  });

  it('never() never pokes', async () => {
    vi.useFakeTimers();
    let pokes = 0;
    PollSchedule.never()
      .pokes()
      .subscribe(() => pokes++);

    await vi.advanceTimersByTimeAsync(600_000);
    expect(pokes).toBe(0);
  });
});
