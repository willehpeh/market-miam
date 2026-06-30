import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Landing } from '../../landing/landing';
import { Dashboard } from '../../dashboard/dashboard';
import { authenticated } from './authenticated.guard';
import { AuthFacade } from './auth.facade';
import { FakeAuthFacade } from './fake.auth.facade';

describe('authenticated guard', () => {
  let fake: FakeAuthFacade;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Landing },
          { path: 'dashboard', component: Dashboard, canActivate: [authenticated] },
        ]),
        { provide: AuthFacade, useClass: FakeAuthFacade },
      ],
    });
    fake = TestBed.inject(AuthFacade) as FakeAuthFacade;
    harness = await RouterTestingHarness.create();
  });

  it('does not bounce while pending, admitting once authenticated resolves', async () => {
    fake.status.set('pending');
    const nav = harness.navigateByUrl('/dashboard');
    fake.status.set('authenticated');
    await nav;

    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
});
