import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CataloguePage } from './catalogue-page';
import { appRoutes } from '../app.routes';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

async function renderPage() {
  const view = await render(CataloguePage, {
    providers: [provideRouter([]), { provide: StorefrontFacade, useClass: FakeStorefrontFacade }],
  });
  return { view, storefront: TestBed.inject(StorefrontFacade) as FakeStorefrontFacade };
}

describe('CataloguePage', () => {
  it('titles the catalogue, whatever is going on beneath it', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Votre catalogue' })).toBeInTheDocument();
  });

  // Which destination that is belongs to the storefront: see its own spec.
  it('returns wherever the storefront says pages beneath the vitrine go', async () => {
    const { view, storefront } = await renderPage();
    storefront.backTo.set('/dashboard/storefront');
    view.detectChanges();

    expect(screen.getByRole('link', { name: /retour/i })).toHaveAttribute('href', '/dashboard/storefront');
  });

  // The reordering is a state of the catalogue, not a page of its own: the real routes
  // have to leave the title standing and swap only what sits beneath it.
  it('holds the title while reordering takes over beneath it', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        { provide: CatalogueFacade, useClass: FakeCatalogueFacade },
        { provide: AuthFacade, useClass: FakeAuthFacade },
        { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      ],
    });
    (TestBed.inject(AuthFacade) as FakeAuthFacade).status.set('authenticated');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/dashboard/catalogue/order');

    expect(screen.getByRole('heading', { name: 'Votre catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });
});
