import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { StorefrontForm } from './storefront-form';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

async function renderForm() {
  const view = await render(StorefrontForm, {
    providers: [{ provide: StorefrontFacade, useClass: FakeStorefrontFacade }],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  return { view, storefront };
}

describe('StorefrontForm', () => {
  it('prefills the form from the current storefront', async () => {
    const { view, storefront } = await renderForm();
    storefront.view.set({ name: 'La Table de Margaux', description: 'Cuisine de marché', imageReference: '' });
    view.detectChanges();

    expect(screen.getByLabelText(/nom du stand/i)).toHaveValue('La Table de Margaux');
    expect(screen.getByLabelText(/slogan/i)).toHaveValue('Cuisine de marché');
  });

  it('saves the name and slogan the vendor enters', async () => {
    const { storefront } = await renderForm();

    fireEvent.input(screen.getByLabelText(/nom du stand/i), { target: { value: 'La Table de Margaux' } });
    fireEvent.input(screen.getByLabelText(/slogan/i), { target: { value: 'Cuisine de marché' } });
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));

    expect(storefront.saved).toEqual({ name: 'La Table de Margaux', description: 'Cuisine de marché' });
  });

  it('keeps téléphone disabled until the API supports them', async () => {
    await renderForm();

    expect(screen.getByLabelText(/téléphone/i)).toBeDisabled();
  });
});
