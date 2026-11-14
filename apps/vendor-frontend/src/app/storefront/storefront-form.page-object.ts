import { fireEvent, render, RenderResult, screen } from '@testing-library/angular';
import { PageObject } from '../core/page-object';
import { StorefrontForm } from './storefront-form';
import { StorefrontFacade } from './storefront.facade';
import { FakeStorefrontFacade } from './fake.storefront.facade';

// The storefront screen as the vendor meets it: the controls they reach for, found by the
// labels they read, and what they do with them (ADR 0062). It asserts nothing, and it never
// hands out the facade: a spec that wants to see a command builds the fake and passes it in.
export class StorefrontFormPageObject extends PageObject<StorefrontForm> {
  private constructor(view: RenderResult<StorefrontForm>) {
    super(view);
  }

  static async render({ storefront = new FakeStorefrontFacade() }: { storefront?: StorefrontFacade } = {}) {
    const view = await render(StorefrontForm, {
      providers: [{ provide: StorefrontFacade, useValue: storefront }],
    });
    return new StorefrontFormPageObject(view);
  }

  // For whatever is still settling once that change is rendered.
  async whenStable(): Promise<this> {
    await this.view.fixture.whenStable();
    return this;
  }

  // The photo

  addPhotoButton(): HTMLElement {
    return screen.getByRole('button', { name: /ajouter image/i });
  }

  photo(): HTMLElement {
    return screen.getByAltText(/photo de votre stand/i);
  }

  uploadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /envoi/i });
  }

  choosePhoto(file: File): this {
    return this.pick(this.photoInput(), file);
  }

  // The fields

  nameField(): HTMLInputElement {
    return screen.getByLabelText(/nom du stand/i) as HTMLInputElement;
  }

  descriptionField(): HTMLTextAreaElement {
    return screen.getByLabelText(/description/i) as HTMLTextAreaElement;
  }

  phoneField(): HTMLInputElement {
    return screen.getByLabelText(/téléphone/i) as HTMLInputElement;
  }

  enterName(name: string): this {
    return this.type(this.nameField(), name);
  }

  enterDescription(description: string): this {
    return this.type(this.descriptionField(), description);
  }

  enterPhone(phone: string): this {
    return this.type(this.phoneField(), phone);
  }

  // Into the name and out again, typing nothing.
  leaveNameBlank(): this {
    fireEvent.focus(this.nameField());
    fireEvent.blur(this.nameField());
    return this.detectChanges();
  }

  // Saving

  saveButton(): HTMLElement {
    return screen.getByRole('button', { name: /enregistrer/i });
  }

  status(): HTMLElement {
    return screen.getByRole('status');
  }

  save(): this {
    return this.press(this.saveButton());
  }

  // The input is hidden behind its button and carries no label, so this is the page's only
  // selector.
  private photoInput(): HTMLInputElement {
    return this.view.container.querySelector('input[type="file"]') as HTMLInputElement;
  }
}
