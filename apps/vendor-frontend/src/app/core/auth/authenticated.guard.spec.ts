import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Landing } from '../../landing/landing';
import { Dashboard } from '../../dashboard/dashboard';
import { authenticated } from './authenticated.guard';
import { AuthFacade } from './auth.facade';
import { FakeAuthFacade } from './fake.auth.facade';
import { StorefrontFacade } from '../../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../../storefront/fake.storefront.facade';
import { CatalogueFacade } from '../../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../../catalogue/fake.catalogue.facade';
import { MarketScheduleFacade } from '../../markets/market-schedule.facade';
import { FakeMarketScheduleFacade } from '../../markets/fake.market-schedule.facade';
import { MarketDayFacade } from '../../market-days/market-day.facade';
import { FakeMarketDayFacade } from '../../market-days/fake.market-day.facade';
import { OnboardingFacade } from '../../onboarding/onboarding.facade';
import { FakeOnboardingFacade } from '../../onboarding/fake.onboarding.facade';
import { Share } from '../share';
import { FakeShare } from '../fake.share';

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
        { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
        { provide: CatalogueFacade, useClass: FakeCatalogueFacade },
        { provide: MarketScheduleFacade, useClass: FakeMarketScheduleFacade },
        { provide: MarketDayFacade, useClass: FakeMarketDayFacade },
        { provide: OnboardingFacade, useClass: FakeOnboardingFacade },
        { provide: Share, useClass: FakeShare },
      ],
    });
    fake = TestBed.inject(AuthFacade) as FakeAuthFacade;
    harness = await RouterTestingHarness.create();
  });

  it('does not bounce while pending, admitting once authenticated resolves', async () => {
    fake.setStatus('pending');
    const nav = harness.navigateByUrl('/dashboard');
    fake.setStatus('authenticated');
    await nav;

    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('sends an anonymous visitor to the landing page', async () => {
    fake.setStatus('anonymous');

    await harness.navigateByUrl('/dashboard');

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('waits for a pending session to resolve anonymous before bouncing', async () => {
    fake.setStatus('pending');
    const nav = harness.navigateByUrl('/dashboard');
    fake.setStatus('anonymous');
    await nav;

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
