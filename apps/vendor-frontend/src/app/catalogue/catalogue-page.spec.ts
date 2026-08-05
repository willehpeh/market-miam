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

async function renderPage() {
  return render(CataloguePage, { providers: [provideRouter([])] });
}

describe('CataloguePage', () => {
  it('titles the catalogue, whatever is going on beneath it', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Votre catalogue' })).toBeInTheDocument();
  });

  it('returns to the dashboard', async () => {
    await renderPage();

    expect(screen.getByRole('link', { name: /retour/i })).toHaveAttribute('href', '/dashboard');
  });

  // The reordering is a state of the catalogue, not a page of its own: the real routes
  // have to leave the title standing and swap only what sits beneath it.
  it('holds the title while reordering takes over beneath it', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        { provide: CatalogueFacade, useClass: FakeCatalogueFacade },
        { provide: AuthFacade, useClass: FakeAuthFacade },
      ],
    });
    (TestBed.inject(AuthFacade) as FakeAuthFacade).status.set('authenticated');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/dashboard/catalogue/order');

    expect(screen.getByRole('heading', { name: 'Votre catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });
});
