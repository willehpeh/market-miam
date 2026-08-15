import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { RouterTestingHarness } from '@angular/router/testing';
import { CataloguePage } from './catalogue-page';
import { appRoutes } from '../app.routes';
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
  //
  // Real routes means the real providers now, since the dashboard subtree carries the
  // catalogue slice itself — a route-level `CatalogueFacade` would shadow a fake supplied
  // here, so this stands the store up rather than pretending. Requests go to the testing
  // backend and are left unanswered: an empty carte renders both things asserted below.
  it('holds the title while reordering takes over beneath it', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideStore(),
        provideEffects(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthFacade, useClass: FakeAuthFacade },
      ],
    });
    (TestBed.inject(AuthFacade) as FakeAuthFacade).setStatus('authenticated');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/dashboard/catalogue/order');

    expect(screen.getByRole('heading', { name: 'Votre catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });
});
