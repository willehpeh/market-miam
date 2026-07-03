import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Onboarding } from './onboarding';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

const EMPTY = { name: '', description: '', imageReference: '' };
const CREATE = { name: /créer ma vitrine/i };

async function renderOnboarding() {
  const view = await render(Onboarding, {
    providers: [{ provide: StorefrontFacade, useClass: FakeStorefrontFacade }],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  return { view, storefront };
}

describe('Onboarding', () => {
  it('asks the facade to load on init', async () => {
    const { storefront } = await renderOnboarding();

    expect(storefront.loaded).toBe(true);
  });

  it('welcomes a vendor whose storefront is completely empty', async () => {
    const { view, storefront } = await renderOnboarding();
    storefront.view.set(EMPTY);
    view.detectChanges();

    expect(screen.getByRole('button', CREATE)).toBeVisible();
  });

  it('opens the prefilled form when the storefront already has information', async () => {
    const { view, storefront } = await renderOnboarding();
    storefront.view.set({ name: 'La Table de Margaux', description: 'Cuisine de marché', imageReference: '' });
    view.detectChanges();

    expect(screen.queryByRole('button', CREATE)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/nom du stand/i)).toHaveValue('La Table de Margaux');
    expect(screen.getByLabelText(/slogan/i)).toHaveValue('Cuisine de marché');
  });

  it('reveals the form when the vendor starts from the welcome screen', async () => {
    const { view, storefront } = await renderOnboarding();
    storefront.view.set(EMPTY);
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', CREATE));

    expect(screen.getByLabelText(/nom du stand/i)).toBeVisible();
  });

  it('saves the name and slogan the vendor enters', async () => {
    const { view, storefront } = await renderOnboarding();
    storefront.view.set(EMPTY);
    view.detectChanges();
    fireEvent.click(screen.getByRole('button', CREATE));

    fireEvent.input(screen.getByLabelText(/nom du stand/i), { target: { value: 'La Table de Margaux' } });
    fireEvent.input(screen.getByLabelText(/slogan/i), { target: { value: 'Cuisine de marché' } });
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));

    expect(storefront.saved).toEqual({ name: 'La Table de Margaux', description: 'Cuisine de marché' });
  });

  it('keeps ville and téléphone disabled until the API supports them', async () => {
    const { view, storefront } = await renderOnboarding();
    storefront.view.set(EMPTY);
    view.detectChanges();
    fireEvent.click(screen.getByRole('button', CREATE));

    expect(screen.getByLabelText(/ville/i)).toBeDisabled();
    expect(screen.getByLabelText(/téléphone/i)).toBeDisabled();
  });
});
