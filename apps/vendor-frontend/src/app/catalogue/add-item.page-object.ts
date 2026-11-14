import { fireEvent, render, RenderResult, screen, within } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AddItem } from './add-item';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';

// The dish screen as the vendor meets it: the controls they reach for, found by the labels
// they read, and what they do with them (ADR 0062). It asserts nothing, and it never hands
// out the facade: a spec that wants to see a command builds the fake and passes it in.
export class AddItemPageObject {
  private constructor(private readonly view: RenderResult<AddItem>) {}

  // Adds a dish without an itemId, edits that dish with one.
  static async render({ catalogue = new FakeCatalogueFacade(), itemId }: { catalogue?: CatalogueFacade; itemId?: string } = {}) {
    const route = itemId
      ? [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ itemId }) } } }]
      : [];
    const view = await render(AddItem, {
      providers: [provideRouter([]), { provide: CatalogueFacade, useValue: catalogue }, ...route],
    });
    return new AddItemPageObject(view);
  }

  // For a change from outside the screen, such as a spec setting its fake's state.
  detectChanges(): this {
    this.view.detectChanges();
    return this;
  }

  // The photo

  // The two inputs are hidden behind their buttons and carry no label, so these are the
  // page's only selectors: the camera's input is the one with `capture`.
  cameraInput(): HTMLInputElement {
    return this.view.container.querySelector('input[type="file"][capture]') as HTMLInputElement;
  }

  rollInput(): HTMLInputElement {
    return this.view.container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
  }

  takePhotoButton(): HTMLElement {
    return screen.getByRole('button', { name: /prendre en photo/i });
  }

  choosePhotoButton(): HTMLElement {
    return screen.getByRole('button', { name: /choisir une photo/i });
  }

  photo(): HTMLElement {
    return screen.getByAltText(/photo du plat/i);
  }

  uploadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /envoi/i });
  }

  takePhoto(file: File): this {
    return this.pick(this.cameraInput(), file);
  }

  choosePhotoFromRoll(file: File): this {
    return this.pick(this.rollInput(), file);
  }

  // The fields

  nameField(): HTMLInputElement {
    return screen.getByLabelText(/nom du plat/i) as HTMLInputElement;
  }

  queryNameField(): HTMLElement | null {
    return screen.queryByLabelText(/nom du plat/i);
  }

  priceField(): HTMLInputElement {
    return screen.getByLabelText(/prix/i) as HTMLInputElement;
  }

  descriptionField(): HTMLInputElement {
    return screen.getByLabelText(/description/i) as HTMLInputElement;
  }

  enterName(name: string): this {
    return this.type(this.nameField(), name);
  }

  enterPrice(price: string): this {
    return this.type(this.priceField(), price);
  }

  enterDescription(description: string): this {
    return this.type(this.descriptionField(), description);
  }

  leavePrice(): this {
    fireEvent.blur(this.priceField());
    return this.detectChanges();
  }

  // Pressing anywhere outside a pending confirmation; the name field is as good as anywhere.
  pressElsewhere(): this {
    fireEvent.pointerDown(this.nameField());
    return this.detectChanges();
  }

  // The formats. Rows count from 1, as the vendor reads them in the buttons' names.

  formatNames(): HTMLInputElement[] {
    return screen.getAllByLabelText(/^format$/i) as HTMLInputElement[];
  }

  formatPrices(): HTMLInputElement[] {
    return screen.getAllByLabelText(/^prix$/i) as HTMLInputElement[];
  }

  deleteFormatButton(row: number): HTMLElement {
    return screen.getByRole('button', { name: `Supprimer le format ${row}` });
  }

  confirmFormatDeleteButton(row: number): HTMLElement {
    return screen.getByRole('button', { name: `Confirmer la suppression du format ${row}` });
  }

  // Whichever row it would be for.
  queryConfirmFormatDeleteButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /confirmer la suppression/i });
  }

  moveFormatUpButton(row: number): HTMLElement {
    return screen.getByRole('button', { name: `Monter le format ${row}` });
  }

  queryMoveFormatUpButton(row: number): HTMLElement | null {
    return screen.queryByRole('button', { name: `Monter le format ${row}` });
  }

  moveFormatDownButton(row: number): HTMLElement {
    return screen.getByRole('button', { name: `Descendre le format ${row}` });
  }

  queryMoveFormatDownButton(row: number): HTMLElement | null {
    return screen.queryByRole('button', { name: `Descendre le format ${row}` });
  }

  chooseSeveralFormats(): this {
    return this.press(screen.getByRole('button', { name: /plusieurs formats/i }));
  }

  addFormat(): this {
    return this.press(screen.getByRole('button', { name: /ajouter un format/i }));
  }

  // Leaves the row's price as it was when none is given.
  enterFormat(row: number, name: string, price?: string): this {
    this.type(this.formatNames()[row - 1], name);
    return price === undefined ? this : this.type(this.formatPrices()[row - 1], price);
  }

  askToDeleteFormat(row: number): this {
    return this.press(this.deleteFormatButton(row));
  }

  confirmFormatDelete(row: number): this {
    return this.press(this.confirmFormatDeleteButton(row));
  }

  moveFormatDown(row: number): this {
    return this.press(this.moveFormatDownButton(row));
  }

  // The allergens

  allergens(): HTMLElement[] {
    return within(screen.getByRole('group', { name: /allergènes/i })).getAllByRole('checkbox');
  }

  allergen(name: RegExp): HTMLElement {
    return screen.getByRole('checkbox', { name });
  }

  noAllergensCheckbox(): HTMLElement {
    return screen.getByRole('checkbox', { name: /aucun de ces 14 allergènes/i });
  }

  tickAllergen(name: RegExp): this {
    return this.press(this.allergen(name));
  }

  untickAllergen(name: RegExp): this {
    return this.press(this.allergen(name));
  }

  declareNoAllergens(): this {
    return this.press(this.noAllergensCheckbox());
  }

  // Adding, saving and deleting

  addButton(): HTMLElement {
    return screen.getByRole('button', { name: /ajouter à ma carte/i });
  }

  saveButton(): HTMLElement {
    return screen.getByRole('button', { name: /enregistrer/i });
  }

  querySaveButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /enregistrer/i });
  }

  deleteButton(): HTMLElement {
    return screen.getByRole('button', { name: /^supprimer$/i });
  }

  queryDeleteButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /^supprimer$/i });
  }

  confirmDeleteButton(): HTMLElement {
    return screen.getByRole('button', { name: /confirmer/i });
  }

  cancelDeleteButton(): HTMLElement {
    return screen.getByRole('button', { name: /annuler/i });
  }

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  catalogueLink(): HTMLElement {
    return screen.getByRole('link', { name: /catalogue/i });
  }

  add(): this {
    return this.press(this.addButton());
  }

  save(): this {
    return this.press(this.saveButton());
  }

  askToDelete(): this {
    return this.press(this.deleteButton());
  }

  confirmDelete(): this {
    return this.press(this.confirmDeleteButton());
  }

  cancelDelete(): this {
    return this.press(this.cancelDeleteButton());
  }

  private press(element: HTMLElement): this {
    fireEvent.click(element);
    return this.detectChanges();
  }

  private type(field: HTMLElement, value: string): this {
    fireEvent.input(field, { target: { value } });
    return this.detectChanges();
  }

  private pick(input: HTMLInputElement, file: File): this {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    return this.detectChanges();
  }
}
