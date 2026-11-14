import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fireEvent, within } from '@testing-library/dom';
import { OperatorPage } from './operator-page';

// The admin page as an operator uses it: what they can do and what they can read, found the
// way a person finds them, by label and by role. Arranging the world around the page, its
// facades and the api's answers, stays with the spec.
export class OperatorPageObject {
  private constructor(private readonly fixture: ComponentFixture<OperatorPage>) {}

  static async open(): Promise<OperatorPageObject> {
    const page = new OperatorPageObject(TestBed.createComponent(OperatorPage));
    await page.settle();
    return page;
  }

  async signIn(): Promise<void> {
    fireEvent.click(this.screen.getByRole('button', { name: /sign in/i }));
    await this.settle();
  }

  async invite(email: string): Promise<void> {
    fireEvent.input(this.screen.getByLabelText(/invite a vendor/i), { target: { value: email } });
    fireEvent.click(this.screen.getByRole('button', { name: 'Invite' }));
    await this.settle();
  }

  // Lets what the page is waiting on run to the end: a render, a form's asynchronous submission.
  async settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await this.fixture.whenStable();
  }

  private get screen() {
    return within(this.fixture.nativeElement as HTMLElement);
  }
}
