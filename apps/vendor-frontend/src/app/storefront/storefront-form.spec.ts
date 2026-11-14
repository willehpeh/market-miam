import { screen } from '@testing-library/angular';
import { StorefrontFormPageObject } from './storefront-form.page-object';
import { FakeStorefrontFacade } from './fake.storefront.facade';

describe('StorefrontForm', () => {
  it('prefills the form from the current storefront', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    storefront.view.set({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché',
      phone: '06 12 34 56 78',
      imageReference: '',
      subdomain: null,
      published: false,
      cartePricesVisible: true,
    });
    page.detectChanges();

    expect(page.nameField()).toHaveValue('La Table de Margaux');
    expect(page.descriptionField()).toHaveValue('Cuisine de marché');
    expect(page.phoneField()).toHaveValue('06 12 34 56 78');
  });

  it('saves the name, description and phone the vendor enters', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });

    page
      .enterName('La Table de Margaux')
      .enterDescription('Cuisine de marché')
      .enterPhone('06 12 34 56 78')
      .save();

    expect(storefront.savedInfo).toEqual({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché',
      phone: '06 12 34 56 78',
    });
  });

  it('lets the vendor leave the optional phone empty', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });

    page.enterName('La Table de Margaux').save();

    expect(page.phoneField()).toBeEnabled();
    expect(storefront.savedInfo).toEqual({ name: 'La Table de Margaux', description: '', phone: '' });
  });

  it('will not let the vendor save without a stand name', async () => {
    const page = await StorefrontFormPageObject.render();

    expect(page.saveButton()).toBeDisabled();

    page.enterName('La Table de Margaux');

    expect(page.saveButton()).toBeEnabled();
  });

  // A disabled button on its own leaves the vendor guessing, and the field's own message
  // only appears once they have touched it.
  it('says why it cannot be saved yet, and describes the button with it', async () => {
    const page = await StorefrontFormPageObject.render();

    expect(screen.getByText('Indiquez le nom du stand.')).toBeVisible();
    expect(page.saveButton()).toHaveAttribute('aria-describedby');
    expect(page.saveButton()).toHaveAccessibleDescription(expect.stringContaining('Indiquez le nom du stand.'));
  });

  it('stops saying so once the stand has a name', async () => {
    const page = await StorefrontFormPageObject.render();

    page.enterName('La Table de Margaux');

    expect(screen.queryByText('Indiquez le nom du stand.')).not.toBeInTheDocument();
    expect(page.saveButton()).not.toHaveAttribute('aria-describedby');
  });

  it.each([
    { published: false, state: 'not yet published' },
    { published: true, state: 'already published' },
  ])('lets the vendor save changes when the storefront is $state', async ({ published }) => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    storefront.view.set({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché',
      phone: '',
      imageReference: '',
      subdomain: published ? 'margaux' : null,
      published,
      cartePricesVisible: true,
    });
    page.detectChanges();

    page.enterDescription('Cuisine de saison').save();

    expect(storefront.savedInfo).toEqual({
      name: 'La Table de Margaux',
      description: 'Cuisine de saison',
      phone: '',
    });
  });

  it('flags the name as required once the vendor leaves it blank', async () => {
    const page = await StorefrontFormPageObject.render();

    page.leaveNameBlank();

    expect(screen.getByText(/nom du stand est requis/i)).toBeVisible();
  });

  it('uploads the photo the vendor picks', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    const file = new File(['bytes'], 'stand.jpg', { type: 'image/jpeg' });

    page.choosePhoto(file);

    expect(storefront.uploadedFile).toBe(file);
  });

  it('rejects a photo larger than 10 Mo without uploading it', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    const big = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    page.choosePhoto(big);

    expect(storefront.uploadedFile).toBeUndefined();
    expect(screen.getByText(/10 Mo/i)).toBeVisible();
  });

  it('shows an uploading state while the photo is sent', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    storefront.coverPhotoUploading.set(true);
    page.detectChanges();

    expect(page.uploadingStatus()).toBeInTheDocument();
    expect(page.addPhotoButton()).toBeDisabled();
  });

  it('previews the stored cover photo', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    storefront.view.set({ name: '', description: '', phone: '', imageReference: 'storefronts/acme/cover-photo', subdomain: null, published: false, cartePricesVisible: true });
    page.detectChanges();

    expect(page.photo()).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_300/storefronts/acme/cover-photo',
    );
  });

  it('confirms the save with a status message', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    storefront.saved.set(true);
    await page.detectChanges().whenStable();

    expect(page.status()).toHaveTextContent(/informations sauvegardées/i);
  });

  it('shows an error when the photo upload fails', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await StorefrontFormPageObject.render({ storefront });
    storefront.coverPhotoError.set(true);
    page.detectChanges();

    expect(screen.getByText(/échoué/i)).toBeVisible();
  });
});
