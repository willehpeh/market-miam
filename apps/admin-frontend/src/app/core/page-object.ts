import { fireEvent, RenderResult } from '@testing-library/angular';

// What every page object shares (ADR 0062). A page object asserts nothing, and it never hands
// out a fake: a spec that arranges or checks one builds it and passes it to `render`. Testing
// Library runs change detection after every event, so a step only returns the page object,
// for the spec to chain what the user does.
export abstract class PageObject<Component> {
  protected constructor(protected readonly view: RenderResult<Component>) {}

  // For a change from outside the screen, such as a spec setting its fake's state.
  detectChanges(): this {
    this.view.detectChanges();
    return this;
  }

  protected press(element: HTMLElement): this {
    fireEvent.click(element);
    return this;
  }

  protected type(field: HTMLElement, value: string): this {
    fireEvent.input(field, { target: { value } });
    return this;
  }

  // A file input is hidden behind its button, so a spec cannot pick through the dialog.
  protected pick(input: HTMLInputElement, file: File): this {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    return this;
  }
}
