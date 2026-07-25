import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AddDish } from './add-dish';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';

async function renderForm() {
  const view = await render(AddDish, {
    providers: [provideRouter([]), { provide: CatalogueFacade, useClass: FakeCatalogueFacade }],
  });
  const catalogue = TestBed.inject(CatalogueFacade) as FakeCatalogueFacade;
  return { view, catalogue };
}

function selectFile(container: Element, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

const anImage = () => new File(['bytes'], 'plat.jpg', { type: 'image/jpeg' });

function fillForm(name: string, price: string) {
  fireEvent.input(screen.getByLabelText(/nom du plat/i), { target: { value: name } });
  fireEvent.input(screen.getByLabelText(/prix/i), { target: { value: price } });
}

describe('AddDish', () => {
  it('starts a fresh dish, clearing any leftover photo state', async () => {
    const { catalogue } = await renderForm();
    expect(catalogue.began).toBe(true);
  });

  it('offers to take a photo of the camera', async () => {
    const { view } = await renderForm();
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('capture')).toBe('environment');
    expect(input.getAttribute('accept')).toBe('image/*');
  });

  it('uploads the picked photo under a freshly minted item id', async () => {
    const { view, catalogue } = await renderForm();
    const file = anImage();

    selectFile(view.container, file);

    expect(catalogue.uploadedPhoto?.file).toBe(file);
    expect(catalogue.uploadedPhoto?.itemId).toMatch(/.+/);
  });

  it('rejects a photo larger than 10 Mo without uploading it', async () => {
    const { view, catalogue } = await renderForm();
    const big = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    selectFile(view.container, big);

    expect(catalogue.uploadedPhoto).toBeUndefined();
    expect(screen.getByText(/10 Mo/i)).toBeVisible();
  });

  it('shows an uploading state while the photo is sent', async () => {
    const { view, catalogue } = await renderForm();
    catalogue.photoUploading.set(true);
    view.detectChanges();

    expect(screen.getByRole('status', { name: /envoi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prendre en photo/i })).toBeDisabled();
  });

  it('previews the uploaded photo', async () => {
    const { view, catalogue } = await renderForm();
    catalogue.newPhotoReference.set('v1/dishes/acme/coq');
    view.detectChanges();

    expect(screen.getByAltText(/photo du plat/i)).toHaveAttribute(
      'src',
      expect.stringContaining('c_fill,w_600,h_400,q_auto,f_webp/v1/dishes/acme/coq'),
    );
  });

  it('shows an error when the photo upload fails', async () => {
    const { view, catalogue } = await renderForm();
    catalogue.photoError.set(true);
    view.detectChanges();

    expect(screen.getByText(/échoué/i)).toBeVisible();
  });

  it('reveals a two-row formats editor when "Plusieurs formats" is chosen', async () => {
    const { view } = await renderForm();

    fireEvent.click(screen.getByRole('button', { name: /plusieurs formats/i }));
    view.detectChanges();

    expect(screen.getAllByLabelText(/^format$/i)).toHaveLength(2);
  });

  it('adds a variant dish, sending its formats and no price', async () => {
    const { view, catalogue } = await renderForm();
    fireEvent.input(screen.getByLabelText(/nom du plat/i), { target: { value: 'Pizza' } });
    fireEvent.click(screen.getByRole('button', { name: /plusieurs formats/i }));
    view.detectChanges();

    const names = screen.getAllByLabelText(/^format$/i);
    const prices = screen.getAllByLabelText(/^prix$/i);
    fireEvent.input(names[0], { target: { value: 'Petite' } });
    fireEvent.input(prices[0], { target: { value: '9,50' } });
    fireEvent.input(names[1], { target: { value: 'Grande' } });
    fireEvent.input(prices[1], { target: { value: '16,00' } });
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /ajouter à ma carte/i }));

    expect(catalogue.addedDish).toEqual({
      itemId: expect.stringMatching(/.+/),
      name: 'Pizza',
      description: '',
      variants: [
        { name: 'Petite', description: '', price: 950 },
        { name: 'Grande', description: '', price: 1600 },
      ],
      imageReference: undefined,
    });
  });

  it('adds and removes format rows, keeping at least two', async () => {
    const { view } = await renderForm();
    fireEvent.click(screen.getByRole('button', { name: /plusieurs formats/i }));
    view.detectChanges();

    expect(screen.getAllByLabelText(/^format$/i)).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /supprimer le format/i })[0]).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /ajouter un format/i }));
    view.detectChanges();
    expect(screen.getAllByLabelText(/^format$/i)).toHaveLength(3);

    const deletes = screen.getAllByRole('button', { name: /supprimer le format/i });
    expect(deletes[0]).toBeEnabled();
    fireEvent.click(deletes[0]);
    view.detectChanges();
    expect(screen.getAllByLabelText(/^format$/i)).toHaveLength(2);
  });

  it('will not submit a formats dish while a format row is incomplete', async () => {
    const { view } = await renderForm();
    fireEvent.input(screen.getByLabelText(/nom du plat/i), { target: { value: 'Pizza' } });
    fireEvent.click(screen.getByRole('button', { name: /plusieurs formats/i }));
    view.detectChanges();

    const names = screen.getAllByLabelText(/^format$/i);
    const prices = screen.getAllByLabelText(/^prix$/i);
    fireEvent.input(names[0], { target: { value: 'Petite' } });
    fireEvent.input(prices[0], { target: { value: '9,50' } });
    fireEvent.input(names[1], { target: { value: 'Grande' } });
    // second format's price left empty
    view.detectChanges();

    expect(screen.getByRole('button', { name: /ajouter à ma carte/i })).toBeDisabled();
  });

  it('reorders formats with the up and down controls', async () => {
    const { view } = await renderForm();
    fireEvent.click(screen.getByRole('button', { name: /plusieurs formats/i }));
    view.detectChanges();

    const names = screen.getAllByLabelText(/^format$/i) as HTMLInputElement[];
    fireEvent.input(names[0], { target: { value: 'Petite' } });
    fireEvent.input(names[1], { target: { value: 'Grande' } });
    view.detectChanges();

    const ups = screen.getAllByRole('button', { name: /monter le format/i });
    const downs = screen.getAllByRole('button', { name: /descendre le format/i });
    expect(ups[0]).toBeDisabled();
    expect(downs[downs.length - 1]).toBeDisabled();

    fireEvent.click(downs[0]);
    view.detectChanges();

    const reordered = screen.getAllByLabelText(/^format$/i) as HTMLInputElement[];
    expect(reordered[0].value).toBe('Grande');
    expect(reordered[1].value).toBe('Petite');
  });

  it('will not submit a formats dish with duplicate format names', async () => {
    const { view } = await renderForm();
    fireEvent.input(screen.getByLabelText(/nom du plat/i), { target: { value: 'Pizza' } });
    fireEvent.click(screen.getByRole('button', { name: /plusieurs formats/i }));
    view.detectChanges();

    const names = screen.getAllByLabelText(/^format$/i);
    const prices = screen.getAllByLabelText(/^prix$/i);
    fireEvent.input(names[0], { target: { value: 'Grande' } });
    fireEvent.input(prices[0], { target: { value: '9,50' } });
    fireEvent.input(names[1], { target: { value: 'Grande' } });
    fireEvent.input(prices[1], { target: { value: '16,00' } });
    view.detectChanges();

    expect(screen.getByRole('button', { name: /ajouter à ma carte/i })).toBeDisabled();
  });

  it('will not submit without a name and a price, but does not require a photo', async () => {
    const { view } = await renderForm();

    expect(screen.getByRole('button', { name: /ajouter à ma carte/i })).toBeDisabled();

    fillForm('Parmentier de canard', '12,00');
    view.detectChanges();

    expect(screen.getByRole('button', { name: /ajouter à ma carte/i })).toBeEnabled();
  });

  it('adds a dish with no photo, sending no image reference', async () => {
    const { view, catalogue } = await renderForm();
    fillForm('Parmentier de canard', '12,00');
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /ajouter à ma carte/i }));

    expect(catalogue.addedDish).toEqual({
      itemId: expect.stringMatching(/.+/),
      name: 'Parmentier de canard',
      description: '',
      price: 1200,
      imageReference: undefined,
    });
  });

  it('will not submit while a price cannot be read as euros', async () => {
    const { view, catalogue } = await renderForm();
    catalogue.newPhotoReference.set('v1/dishes/acme/coq');
    fillForm('Parmentier de canard', 'gratuit');
    view.detectChanges();

    expect(screen.getByRole('button', { name: /ajouter à ma carte/i })).toBeDisabled();
    fireEvent.blur(screen.getByLabelText(/prix/i));
    expect(screen.getByText(/par exemple 12,00/i)).toBeVisible();
  });

  it('adds the dish with its price in cents and the uploaded photo, reusing the upload item id', async () => {
    const { view, catalogue } = await renderForm();
    selectFile(view.container, anImage());
    catalogue.newPhotoReference.set('v1/dishes/acme/coq');
    fillForm('Parmentier de canard', '12,50');
    fireEvent.input(screen.getByLabelText(/description/i), { target: { value: 'Confit effiloché' } });
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /ajouter à ma carte/i }));

    expect(catalogue.addedDish).toEqual({
      itemId: catalogue.uploadedPhoto?.itemId,
      name: 'Parmentier de canard',
      description: 'Confit effiloché',
      price: 1250,
      imageReference: 'v1/dishes/acme/coq',
    });
  });

  describe('editing an existing dish', () => {
    const existing = {
      itemId: 'item-1',
      name: 'Bœuf bourguignon',
      description: 'Mijoté maison',
      price: 1300,
      imageReference: 'v1/dishes/acme/item-1',
    };

    async function renderEdit() {
      const catalogue = new FakeCatalogueFacade();
      catalogue.items.set([existing]);
      const view = await render(AddDish, {
        providers: [
          provideRouter([]),
          { provide: CatalogueFacade, useValue: catalogue },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ itemId: 'item-1' }) } } },
        ],
      });
      return { view, catalogue };
    }

    it('prefills the form with the existing dish, price back in euros', async () => {
      await renderEdit();

      expect(screen.getByLabelText(/nom du plat/i)).toHaveValue('Bœuf bourguignon');
      expect(screen.getByLabelText(/prix/i)).toHaveValue('13,00');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Mijoté maison');
    });

    it('shows the current photo', async () => {
      await renderEdit();

      expect(screen.getByAltText(/photo du plat/i)).toHaveAttribute('src', expect.stringContaining('v1/dishes/acme/item-1'));
    });

    it('revises the dish on submit rather than adding', async () => {
      const { view, catalogue } = await renderEdit();
      fireEvent.input(screen.getByLabelText(/nom du plat/i), { target: { value: 'Bœuf mode' } });
      fireEvent.input(screen.getByLabelText(/prix/i), { target: { value: '14,00' } });
      view.detectChanges();

      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

      expect(catalogue.revisedDish).toEqual({ itemId: 'item-1', name: 'Bœuf mode', description: 'Mijoté maison', price: 1400 });
      expect(catalogue.addedDish).toBeUndefined();
    });

    it('uploads a newly picked photo under the existing item id', async () => {
      const { view, catalogue } = await renderEdit();
      selectFile(view.container, anImage());

      expect(catalogue.uploadedPhoto?.itemId).toBe('item-1');
    });
  });
});
