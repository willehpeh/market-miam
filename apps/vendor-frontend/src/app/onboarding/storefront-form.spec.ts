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
    storefront.view.set({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché',
      phone: '06 12 34 56 78',
      imageReference: '',
    });
    view.detectChanges();

    expect(screen.getByLabelText(/nom du stand/i)).toHaveValue('La Table de Margaux');
    expect(screen.getByLabelText(/slogan/i)).toHaveValue('Cuisine de marché');
    expect(screen.getByLabelText(/téléphone/i)).toHaveValue('06 12 34 56 78');
  });

  it('saves the name, slogan and phone the vendor enters', async () => {
    const { storefront } = await renderForm();

    fireEvent.input(screen.getByLabelText(/nom du stand/i), { target: { value: 'La Table de Margaux' } });
    fireEvent.input(screen.getByLabelText(/slogan/i), { target: { value: 'Cuisine de marché' } });
    fireEvent.input(screen.getByLabelText(/téléphone/i), { target: { value: '06 12 34 56 78' } });
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));

    expect(storefront.saved).toEqual({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché',
      phone: '06 12 34 56 78',
    });
  });

  it('lets the vendor leave the optional phone empty', async () => {
    const { storefront } = await renderForm();

    fireEvent.input(screen.getByLabelText(/nom du stand/i), { target: { value: 'La Table de Margaux' } });
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));

    expect(screen.getByLabelText(/téléphone/i)).toBeEnabled();
    expect(storefront.saved).toEqual({ name: 'La Table de Margaux', description: '', phone: '' });
  });
});
