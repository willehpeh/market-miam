import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Subject } from 'rxjs';
import { DataKeys, InMemoryDataKeys } from '@market-miam/event-sourcing';
import { apiTestModule, fixedClock, startApp } from '../testing/api-test-app';
import { SHRED_SWEEP_TICKS } from './shred-sweep';

// The database is unreachable for the first sweep only.
class OnceUnreachableDataKeys extends InMemoryDataKeys {
  private unreachable = true;

  override shredDue(now: Date): Promise<void> {
    if (this.unreachable) {
      this.unreachable = false;
      return Promise.reject(new Error('connection refused'));
    }
    return super.shredDue(now);
  }
}

describe('The shred sweep', () => {
  let app: INestApplication;
  let keys: DataKeys;
  let ticks: Subject<void>;

  beforeEach(async () => {
    keys = new OnceUnreachableDataKeys();
    ticks = new Subject<void>();
    app = await startApp(
      apiTestModule({ clock: fixedClock })
        .overrideProvider(DataKeys).useValue(keys)
        .overrideProvider(SHRED_SWEEP_TICKS).useValue(ticks),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('sweeps again on the next tick after a sweep fails', async () => {
    await keys.getOrCreateKeyFor('acme-bakery:legal');
    await keys.scheduleShred('acme-bakery:legal', new Date(fixedClock.now().value()));

    ticks.next();
    await new Promise((resolve) => setImmediate(resolve));
    ticks.next();

    expect(await keys.findKeyFor('acme-bakery:legal')).toBeNull();
  });
});
