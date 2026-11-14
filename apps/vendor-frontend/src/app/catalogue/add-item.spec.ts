import { screen } from '@testing-library/angular';
import { AddItemPageObject } from './add-item.page-object';
import { catalogueOf, FakeCatalogueFacade } from './fake.catalogue.facade';
import { CatalogueItemView } from './catalogue';

const anImage = () => new File(['bytes'], 'plat.jpg', { type: 'image/jpeg' });

const existing: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/items/acme/item-1',
  allergens: ['gluten', 'milk'],
};

const pizza: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Pizza',
  description: 'Wood-fired',
  imageReference: '',
  allergens: ['gluten', 'milk'],
  variants: [
    { name: 'Margherita', description: 'tomato', price: 900 },
    { name: 'Pepperoni', description: 'spicy', price: 1200 },
  ],
};

describe('AddItem', () => {
  it('starts a fresh item, clearing any leftover photo state', async () => {
    const catalogue = new FakeCatalogueFacade();
    await AddItemPageObject.render({ catalogue });

    expect(catalogue.began).toBe(true);
  });

  it('offers to take a photo with the camera', async () => {
    const page = await AddItemPageObject.render();

    expect(page.cameraInput().getAttribute('capture')).toBe('environment');
    expect(page.cameraInput().getAttribute('accept')).toBe('image/*');
    expect(page.takePhotoButton()).toBeInTheDocument();
  });

  it('offers a photo from the roll, without forcing the camera', async () => {
    const page = await AddItemPageObject.render();

    expect(page.rollInput().getAttribute('accept')).toBe('image/*');
    expect(page.rollInput().hasAttribute('capture')).toBe(false);
    expect(page.choosePhotoButton()).toBeInTheDocument();
  });

  it('uploads a photo picked from the roll', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    const file = anImage();

    page.choosePhotoFromRoll(file);

    expect(catalogue.uploadedPhoto?.file).toBe(file);
  });

  it('uploads the picked photo under a freshly minted item id', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    const file = anImage();

    page.takePhoto(file);

    expect(catalogue.uploadedPhoto?.file).toBe(file);
    expect(catalogue.uploadedPhoto?.itemId).toMatch(/.+/);
  });

  it('hands a heavy photo straight to the upload, which decides on size after shrinking it', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    const big = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    page.takePhoto(big);

    expect(catalogue.uploadedPhoto?.file).toBe(big);
  });

  it('says so when a photo is refused as too heavy', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });

    catalogue.photoTooLarge.set(true);
    page.detectChanges();

    expect(screen.getByText(/trop lourde/i)).toBeVisible();
  });

  it('shows an uploading state while the photo is sent', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });

    catalogue.photoUploading.set(true);
    page.detectChanges();

    expect(page.uploadingStatus()).toBeInTheDocument();
    expect(page.takePhotoButton()).toBeDisabled();
    expect(page.choosePhotoButton()).toBeDisabled();
  });

  it('previews the uploaded photo', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });

    catalogue.newPhotoReference.set('v1/items/acme/coq');
    page.detectChanges();

    expect(page.photo()).toHaveAttribute(
      'src',
      expect.stringContaining('c_fill,w_600,h_400,q_auto,f_webp/v1/items/acme/coq'),
    );
  });

  it('shows an error when the photo upload fails', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });

    catalogue.photoError.set(true);
    page.detectChanges();

    expect(screen.getByText(/échoué/i)).toBeVisible();
  });

  it('reveals a two-row formats editor when "Plusieurs formats" is chosen', async () => {
    const page = await AddItemPageObject.render();

    page.chooseSeveralFormats();

    expect(page.formatNames()).toHaveLength(2);
  });

  it('adds a variant item, sending its formats and no price', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    page
      .enterName('Pizza')
      .chooseSeveralFormats()
      .enterFormat(1, 'Petite', '9,50')
      .enterFormat(2, 'Grande', '16,00')
      .declareNoAllergens();

    page.add();

    expect(catalogue.addedItem).toEqual({
      itemId: expect.stringMatching(/.+/),
      name: 'Pizza',
      description: '',
      allergens: [],
      variants: [
        { name: 'Petite', description: '', price: 950 },
        { name: 'Grande', description: '', price: 1600 },
      ],
      imageReference: undefined,
    });
  });

  it('adds and removes format rows, keeping at least two', async () => {
    const page = await AddItemPageObject.render();
    page.chooseSeveralFormats();

    expect(page.formatNames()).toHaveLength(2);
    expect(page.deleteFormatButton(1)).toBeDisabled();

    page.addFormat();
    expect(page.formatNames()).toHaveLength(3);

    expect(page.deleteFormatButton(1)).toBeEnabled();
    page.askToDeleteFormat(1).confirmFormatDelete(1);
    expect(page.formatNames()).toHaveLength(2);
  });

  it('asks before deleting a format, standing that row\'s arrows down while it does', async () => {
    const page = await AddItemPageObject.render();
    page.chooseSeveralFormats().addFormat();

    page.askToDeleteFormat(1);

    expect(page.confirmFormatDeleteButton(1)).toBeInTheDocument();
    expect(page.queryMoveFormatDownButton(1)).not.toBeInTheDocument();
    expect(page.queryMoveFormatUpButton(1)).not.toBeInTheDocument();
    // the rows that were not asked about keep theirs
    expect(page.moveFormatDownButton(2)).toBeInTheDocument();
    expect(page.formatNames()).toHaveLength(3);
  });

  it('abandons a pending format delete when the vendor presses elsewhere', async () => {
    const page = await AddItemPageObject.render();
    page.chooseSeveralFormats().addFormat().askToDeleteFormat(1);

    page.pressElsewhere();

    expect(page.queryConfirmFormatDeleteButton()).not.toBeInTheDocument();
    expect(page.moveFormatDownButton(1)).toBeInTheDocument();
    expect(page.formatNames()).toHaveLength(3);
  });

  // The pending row is tracked by index, so anything that renumbers the list has to drop it —
  // otherwise the second tap lands on whichever format has since moved into that slot.
  it('drops a pending format delete when another row is reordered', async () => {
    const page = await AddItemPageObject.render();
    page.chooseSeveralFormats().addFormat().askToDeleteFormat(1);

    page.moveFormatDown(2);

    expect(page.queryConfirmFormatDeleteButton()).not.toBeInTheDocument();
    expect(page.formatNames()).toHaveLength(3);
  });

  it('will not submit a formats item while a format row is incomplete', async () => {
    const page = await AddItemPageObject.render();

    page
      .enterName('Pizza')
      .chooseSeveralFormats()
      .enterFormat(1, 'Petite', '9,50')
      .enterFormat(2, 'Grande'); // second format's price left empty

    expect(page.addButton()).toBeDisabled();
  });

  it('reorders formats with the up and down controls', async () => {
    const page = await AddItemPageObject.render();
    page.chooseSeveralFormats().enterFormat(1, 'Petite').enterFormat(2, 'Grande');

    expect(page.moveFormatUpButton(1)).toBeDisabled();
    expect(page.moveFormatDownButton(2)).toBeDisabled();

    page.moveFormatDown(1);

    expect(page.formatNames().map((name) => name.value)).toEqual(['Grande', 'Petite']);
  });

  it('will not submit a formats item with duplicate format names', async () => {
    const page = await AddItemPageObject.render();

    page
      .enterName('Pizza')
      .chooseSeveralFormats()
      .enterFormat(1, 'Grande', '9,50')
      .enterFormat(2, 'Grande', '16,00');

    expect(page.addButton()).toBeDisabled();
  });

  it('will not submit without a name and a price, but does not require a photo', async () => {
    const page = await AddItemPageObject.render();

    expect(page.addButton()).toBeDisabled();

    page.enterName('Parmentier de canard').enterPrice('12,00').declareNoAllergens();

    expect(page.addButton()).toBeEnabled();
  });

  it('adds an item with no photo, sending no image reference', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    page.enterName('Parmentier de canard').enterPrice('12,00').declareNoAllergens();

    page.add();

    expect(catalogue.addedItem).toEqual({
      itemId: expect.stringMatching(/.+/),
      name: 'Parmentier de canard',
      description: '',
      price: 1200,
      imageReference: undefined,
      allergens: [],
    });
  });

  it('will not submit while a price cannot be read as euros', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    catalogue.newPhotoReference.set('v1/items/acme/coq');

    page.enterName('Parmentier de canard').enterPrice('gratuit').declareNoAllergens();

    expect(page.addButton()).toBeDisabled();
    page.leavePrice();
    expect(screen.getByText(/par exemple 12,00/i)).toBeVisible();
  });

  it('adds the item with its price in cents and the uploaded photo, reusing the upload item id', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await AddItemPageObject.render({ catalogue });
    page.takePhoto(anImage());
    catalogue.newPhotoReference.set('v1/items/acme/coq');
    page
      .enterName('Parmentier de canard')
      .enterPrice('12,50')
      .declareNoAllergens()
      .enterDescription('Confit effiloché');

    page.add();

    expect(catalogue.addedItem).toEqual({
      itemId: catalogue.uploadedPhoto?.itemId,
      name: 'Parmentier de canard',
      description: 'Confit effiloché',
      price: 1250,
      imageReference: 'v1/items/acme/coq',
      allergens: [],
    });
  });

  describe('editing an existing item', () => {
    it('prefills the form with the existing item, price back in euros', async () => {
      const page = await AddItemPageObject.render({ catalogue: catalogueOf(existing), itemId: 'item-1' });

      expect(page.nameField()).toHaveValue('Bœuf bourguignon');
      expect(page.priceField()).toHaveValue('13,00');
      expect(page.descriptionField()).toHaveValue('Mijoté maison');
    });

    it('opens a variant item in formats mode, prefilled', async () => {
      const page = await AddItemPageObject.render({ catalogue: catalogueOf(pizza), itemId: 'item-1' });

      expect(page.formatNames().map((name) => name.value)).toEqual(['Margherita', 'Pepperoni']);
      expect(page.formatPrices().map((price) => price.value)).toEqual(['9,00', '12,00']);
    });

    it('shows the current photo', async () => {
      const page = await AddItemPageObject.render({ catalogue: catalogueOf(existing), itemId: 'item-1' });

      expect(page.photo()).toHaveAttribute('src', expect.stringContaining('v1/items/acme/item-1'));
    });

    it('revises the item on submit rather than adding', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      page.enterName('Bœuf mode').enterPrice('14,00');

      page.save();

      expect(catalogue.revisedItem).toEqual({ itemId: 'item-1', name: 'Bœuf mode', description: 'Mijoté maison', price: 1400, allergens: ['gluten', 'milk'] });
      expect(catalogue.addedItem).toBeUndefined();
    });

    it('uploads a newly picked photo under the existing item id', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

      page.takePhoto(anImage());

      expect(catalogue.uploadedPhoto?.itemId).toBe('item-1');
    });

    it('offers to delete the item', async () => {
      const page = await AddItemPageObject.render({ catalogue: catalogueOf(existing), itemId: 'item-1' });

      expect(page.deleteButton()).toBeInTheDocument();
    });

    it('asks the vendor to confirm rather than deleting on the first tap', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

      page.askToDelete();

      expect(catalogue.retiredItem).toBeUndefined();
      expect(page.confirmDeleteButton()).toBeInTheDocument();
      expect(page.cancelDeleteButton()).toBeInTheDocument();
    });

    it('retires the item once the vendor confirms', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      page.askToDelete();

      page.confirmDelete();

      expect(catalogue.retiredItem).toBe('item-1');
    });

    it('abandons the deletion when the vendor backs out', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      page.askToDelete();

      page.cancelDelete();

      expect(catalogue.retiredItem).toBeUndefined();
      expect(page.deleteButton()).toBeInTheDocument();
    });

    it('abandons the deletion when the vendor presses elsewhere', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      page.askToDelete();

      page.pressElsewhere();

      expect(catalogue.retiredItem).toBeUndefined();
      expect(page.deleteButton()).toBeInTheDocument();
    });

    it('does not submit the form when confirming the deletion', async () => {
      const catalogue = catalogueOf(existing);
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      page.askToDelete();

      page.confirmDelete();

      expect(catalogue.revisedItem).toBeUndefined();
    });
  });

  // INCO 1169/2011: a dish says which of the 14 it contains. "None" is a declaration the
  // vendor makes, never what an untouched form means (ALLERGENS-PLAN.md decision 3).
  describe('declaring allergens', () => {
    it('offers the 14 allergens of the regulation, and none of them', async () => {
      const page = await AddItemPageObject.render();

      expect(page.allergens()).toHaveLength(15);
      expect(page.allergen(/céréales contenant du gluten/i)).not.toBeChecked();
      expect(page.allergen(/anhydride sulfureux et sulfites/i)).not.toBeChecked();
    });

    it("adds the dish with the allergens ticked, in the regulation's order", async () => {
      const catalogue = new FakeCatalogueFacade();
      const page = await AddItemPageObject.render({ catalogue });
      page.enterName('Parmentier de canard').enterPrice('12,00');

      page.tickAllergen(/^lait$/i).tickAllergen(/céréales contenant du gluten/i).add();

      expect(catalogue.addedItem?.allergens).toEqual(['gluten', 'milk']);
    });

    it('adds the dish as containing none of the 14 when the vendor says so', async () => {
      const catalogue = new FakeCatalogueFacade();
      const page = await AddItemPageObject.render({ catalogue });
      page.enterName('Parmentier de canard').enterPrice('12,00');

      page.declareNoAllergens().add();

      expect(catalogue.addedItem?.allergens).toEqual([]);
    });

    it('will not add a dish whose allergens are not declared, and says so', async () => {
      const page = await AddItemPageObject.render();

      page.enterName('Parmentier de canard').enterPrice('12,00');

      expect(page.addButton()).toBeDisabled();
      expect(screen.getByText('Indiquez les allergènes du plat.')).toBeVisible();
    });

    it('clears the ticked allergens when the vendor ticks none', async () => {
      const page = await AddItemPageObject.render();
      page.tickAllergen(/^œufs$/i);

      page.declareNoAllergens();

      expect(page.allergen(/^œufs$/i)).not.toBeChecked();
      expect(page.noAllergensCheckbox()).toBeChecked();
    });

    it('stops saying none once the vendor ticks an allergen', async () => {
      const page = await AddItemPageObject.render();
      page.declareNoAllergens();

      page.tickAllergen(/^moutarde$/i);

      expect(page.noAllergensCheckbox()).not.toBeChecked();
      expect(page.allergen(/^moutarde$/i)).toBeChecked();
    });

    // Unticking the last box is not a claim that the dish is safe.
    it('leaves the dish undeclared, not allergen-free, once its last allergen is unticked', async () => {
      const page = await AddItemPageObject.render();
      page.enterName('Parmentier de canard').enterPrice('12,00').tickAllergen(/^soja$/i);

      page.untickAllergen(/^soja$/i);

      expect(page.noAllergensCheckbox()).not.toBeChecked();
      expect(page.addButton()).toBeDisabled();
    });

    describe('on a dish already on the carte', () => {
      const dish: CatalogueItemView = {
        itemId: 'item-1', name: 'Bœuf bourguignon', description: '', price: 1300, imageReference: '', allergens: ['celery', 'sulphites'],
      };

      it('ticks the allergens it declares', async () => {
        const page = await AddItemPageObject.render({ catalogue: catalogueOf(dish), itemId: 'item-1' });

        expect(page.allergen(/^céleri$/i)).toBeChecked();
        expect(page.allergen(/anhydride sulfureux et sulfites/i)).toBeChecked();
        expect(page.allergen(/^lait$/i)).not.toBeChecked();
      });

      it('ticks none for a dish declared free of the 14', async () => {
        const page = await AddItemPageObject.render({ catalogue: catalogueOf({ ...dish, allergens: [] }), itemId: 'item-1' });

        expect(page.noAllergensCheckbox()).toBeChecked();
      });

      // Added before allergens existed: the vendor has to say, the form will not assume.
      it('asks for the allergens of a dish that has never declared them', async () => {
        const page = await AddItemPageObject.render({ catalogue: catalogueOf({ ...dish, allergens: null }), itemId: 'item-1' });

        expect(page.saveButton()).toBeDisabled();
        expect(screen.getByText('Indiquez les allergènes du plat.')).toBeVisible();
      });

      it('revises the dish with the allergens as changed', async () => {
        const catalogue = catalogueOf(dish);
        const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

        page.untickAllergen(/^céleri$/i).save();

        expect(catalogue.revisedItem?.allergens).toEqual(['sulphites']);
      });
    });
  });

  // The submit button stays disabled until the dish can be saved, which on its own tells
  // the vendor nothing about why. These say why, and are tied to the button so a screen
  // reader reads them as its description.
  describe('saying why the dish cannot be added yet', () => {
    it('names what a blank form is still missing', async () => {
      await AddItemPageObject.render();

      expect(screen.getByText('Indiquez le nom du plat.')).toBeVisible();
      expect(screen.getByText('Indiquez le prix.')).toBeVisible();
    });

    it('describes the disabled button with those reasons', async () => {
      const page = await AddItemPageObject.render();

      expect(page.addButton()).toHaveAccessibleDescription(expect.stringContaining('Indiquez le nom du plat.'));
    });

    it('drops a reason as soon as it is met', async () => {
      const page = await AddItemPageObject.render();

      page.enterName('Parmentier');

      expect(screen.queryByText('Indiquez le nom du plat.')).not.toBeInTheDocument();
      expect(screen.getByText('Indiquez le prix.')).toBeVisible();
    });

    it('says nothing once the dish can be added', async () => {
      const page = await AddItemPageObject.render();

      page.enterName('Parmentier de canard').enterPrice('12,00').declareNoAllergens();

      expect(page.addButton()).toBeEnabled();
      expect(screen.queryByText('Indiquez le prix.')).not.toBeInTheDocument();
      expect(page.addButton()).not.toHaveAttribute('aria-describedby');
    });

    it('names an incomplete format row', async () => {
      const page = await AddItemPageObject.render();

      page.chooseSeveralFormats().addFormat();

      expect(screen.getByText('Complétez chaque format.')).toBeVisible();
    });

    it('names formats that share a name', async () => {
      const page = await AddItemPageObject.render();

      page
        .enterName('Pizza')
        .chooseSeveralFormats()
        .enterFormat(1, 'Grande', '9,50')
        .enterFormat(2, 'Grande', '16,00');

      expect(screen.getByText('Donnez un nom différent à chaque format.')).toBeVisible();
    });

    it('asks the vendor to wait while a photo is still uploading', async () => {
      const catalogue = new FakeCatalogueFacade();
      const page = await AddItemPageObject.render({ catalogue });
      page.enterName('Parmentier de canard').enterPrice('12,00').declareNoAllergens();

      catalogue.photoUploading.set(true);
      page.detectChanges();

      expect(screen.getByText("Attendez la fin de l'envoi de la photo.")).toBeVisible();
    });
  });

  it('offers no delete for an item that does not exist yet', async () => {
    const page = await AddItemPageObject.render();

    expect(page.queryDeleteButton()).not.toBeInTheDocument();
  });

  // A cold direct-nav to an edit link — a bookmark, a refresh — arrives before the
  // catalogue does. The screen used to read its dish once at field init and render an
  // empty form, which saving then wrote back over the real one; a route guard held the
  // navigation to hide it. The screen waits for its own data instead.
  describe('editing an item the store has not delivered yet', () => {
    function stillLoading(): FakeCatalogueFacade {
      const catalogue = new FakeCatalogueFacade();
      catalogue.loading.set(true);
      return catalogue;
    }

    function deliver(catalogue: FakeCatalogueFacade, items: CatalogueItemView[]) {
      catalogue.items.set(items);
      catalogue.loading.set(false);
    }

    it('asks for the catalogue itself, now that no guard warms it', async () => {
      const catalogue = stillLoading();
      await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

      expect(catalogue.loaded).toBe(true);
    });

    it('waits rather than offering an empty form', async () => {
      const page = await AddItemPageObject.render({ catalogue: stillLoading(), itemId: 'item-1' });

      expect(page.loadingStatus()).toBeInTheDocument();
      expect(page.queryNameField()).not.toBeInTheDocument();
      expect(page.querySaveButton()).not.toBeInTheDocument();
    });

    it('prefills once the dish arrives', async () => {
      const catalogue = stillLoading();
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

      deliver(catalogue, [existing]);
      page.detectChanges();

      expect(page.nameField()).toHaveValue('Bœuf bourguignon');
      expect(page.priceField()).toHaveValue('13,00');
    });

    // The hazard the old shape hid: minting an id at field init picked create-mode before
    // the dish landed, so a save on a cold refresh added a second copy instead of editing.
    it('revises the dish that arrives rather than adding a second copy', async () => {
      const catalogue = stillLoading();
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      deliver(catalogue, [existing]);
      page.detectChanges();

      page.enterName('Bœuf mode').save();

      expect(catalogue.revisedItem).toEqual({
        itemId: 'item-1',
        name: 'Bœuf mode',
        description: 'Mijoté maison',
        price: 1300,
        allergens: ['gluten', 'milk'],
      });
      expect(catalogue.addedItem).toBeUndefined();
    });

    it('opens a late variant dish in formats mode', async () => {
      const catalogue = stillLoading();
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

      deliver(catalogue, [pizza]);
      page.detectChanges();

      expect(page.formatNames().map((name) => name.value)).toEqual(['Margherita', 'Pepperoni']);
    });

    // A photo finishing its upload patches the item in the store. That must not reach in
    // and retype the fields the vendor is working in.
    it('keeps what the vendor typed when the store updates underneath', async () => {
      const catalogue = stillLoading();
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });
      deliver(catalogue, [existing]);
      page.detectChanges().enterName('Bœuf mode');

      catalogue.items.set([{ ...existing, imageReference: 'v2/items/acme/item-1' }]);
      page.detectChanges();

      expect(page.nameField()).toHaveValue('Bœuf mode');
    });

    it('says so when the dish is no longer on the carte, offering no save', async () => {
      const catalogue = stillLoading();
      const page = await AddItemPageObject.render({ catalogue, itemId: 'item-1' });

      deliver(catalogue, []);
      page.detectChanges();

      expect(screen.getByText(/n'est plus à votre carte/i)).toBeVisible();
      expect(page.catalogueLink()).toBeInTheDocument();
      expect(page.querySaveButton()).not.toBeInTheDocument();
    });
  });
});
