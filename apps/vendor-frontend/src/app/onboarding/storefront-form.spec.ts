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

function selectFile(container: Element, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
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

  it('will not let the vendor continue without a stand name', async () => {
    await renderForm();

    expect(screen.getByRole('button', { name: /continuer/i })).toBeDisabled();

    fireEvent.input(screen.getByLabelText(/nom du stand/i), { target: { value: 'La Table de Margaux' } });

    expect(screen.getByRole('button', { name: /continuer/i })).toBeEnabled();
  });

  it('flags the name as required once the vendor leaves it blank', async () => {
    await renderForm();

    fireEvent.focus(screen.getByLabelText(/nom du stand/i));
    fireEvent.blur(screen.getByLabelText(/nom du stand/i));

    expect(screen.getByText(/nom du stand est requis/i)).toBeVisible();
  });

  it('uploads the photo the vendor picks', async () => {
    const { view, storefront } = await renderForm();
    const file = new File(['bytes'], 'stand.jpg', { type: 'image/jpeg' });

    selectFile(view.container, file);

    expect(storefront.uploadedFile).toBe(file);
  });

  it('rejects a photo larger than 10 Mo without uploading it', async () => {
    const { view, storefront } = await renderForm();
    const big = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    selectFile(view.container, big);

    expect(storefront.uploadedFile).toBeUndefined();
    expect(screen.getByText(/10 Mo/i)).toBeVisible();
  });

  it('shows an uploading state while the photo is sent', async () => {
    const { view, storefront } = await renderForm();
    storefront.coverPhotoUploading.set(true);
    view.detectChanges();

    expect(screen.getByRole('button', { name: /envoi/i })).toBeDisabled();
  });

  it('previews the stored cover photo', async () => {
    const { view, storefront } = await renderForm();
    storefront.view.set({ name: '', description: '', phone: '', imageReference: 'storefronts/acme/cover-photo' });
    view.detectChanges();

    expect(screen.getByAltText(/photo de votre stand/i)).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_300/storefronts/acme/cover-photo',
    );
  });

  it('shows an error when the photo upload fails', async () => {
    const { view, storefront } = await renderForm();
    storefront.coverPhotoError.set(true);
    view.detectChanges();

    expect(screen.getByText(/échoué/i)).toBeVisible();
  });
});
