import { fireEvent, RenderResult } from '@testing-library/angular';

// What every page object does the same way (ADR 0062): each step runs change detection and
// returns the page object, so a spec chains what the user does.
export abstract class PageObject<Component> {
  protected constructor(protected readonly view: RenderResult<Component>) {}

  // For a change from outside the screen, such as a spec setting its fake's state.
  detectChanges(): this {
    this.view.detectChanges();
    return this;
  }

  protected press(element: HTMLElement): this {
    fireEvent.click(element);
    return this.detectChanges();
  }

  protected type(field: HTMLElement, value: string): this {
    fireEvent.input(field, { target: { value } });
    return this.detectChanges();
  }

  // A file input is hidden behind its button, so a spec cannot pick through the dialog.
  protected pick(input: HTMLInputElement, file: File): this {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    return this.detectChanges();
  }
}
