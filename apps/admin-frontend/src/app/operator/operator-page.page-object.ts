import { render, RenderResult, screen } from '@testing-library/angular';
import { PageObject } from '../core/page-object';
import { OperatorPage } from './operator-page';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';
import { InvitationFacade } from '../invitations/invitation.facade';
import { FakeInvitationFacade } from '../invitations/fake.invitation.facade';
import { AccountsFacade } from '../accounts/accounts.facade';
import { FakeAccountsFacade } from '../accounts/fake.accounts.facade';

// The admin page as an operator uses it: signing in and out, the accounts, and the invitation
// (ADR 0062).
export class OperatorPageObject extends PageObject<OperatorPage> {
  private constructor(view: RenderResult<OperatorPage>) {
    super(view);
  }

  static async render({
    auth = new FakeAuthFacade(),
    invitations = new FakeInvitationFacade(),
    accounts = new FakeAccountsFacade(),
  }: { auth?: AuthFacade; invitations?: InvitationFacade; accounts?: AccountsFacade } = {}) {
    const view = await render(OperatorPage, {
      providers: [
        { provide: AuthFacade, useValue: auth },
        { provide: InvitationFacade, useValue: invitations },
        { provide: AccountsFacade, useValue: accounts },
      ],
    });
    return new OperatorPageObject(view);
  }

  // Signing in and out

  signInButton(): HTMLElement {
    return screen.getByRole('button', { name: /sign in/i });
  }

  querySignInButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /sign in/i });
  }

  signIn(): this {
    return this.press(this.signInButton());
  }

  signOut(): this {
    return this.press(screen.getByRole('button', { name: /sign out/i }));
  }

  // The accounts

  // Each account as the operator reads its row: its visible texts, in order. A row's parts sit
  // in elements of their own with no space between them, so its textContent runs them together.
  accounts(): string[] {
    return screen.queryAllByRole('listitem').map(visibleText);
  }

  storefrontLink(name: string): HTMLElement {
    return screen.getByRole('link', { name });
  }

  // The invitation

  addressField(): HTMLInputElement {
    return screen.getByLabelText(/invite a vendor/i) as HTMLInputElement;
  }

  queryAddressField(): HTMLElement | null {
    return screen.queryByLabelText(/invite a vendor/i);
  }

  inviteButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Invite' });
  }

  // The form hands the address over from an asynchronous submission, so the invitation has
  // gone only once the page has settled.
  async invite(email: string): Promise<this> {
    this.type(this.addressField(), email).press(this.inviteButton());
    await new Promise((resolve) => setTimeout(resolve));
    await this.view.fixture.whenStable();
    return this;
  }
}

function visibleText(element: Element): string {
  const texts: string[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text) {
      texts.push(text);
    }
  }
  return texts.join(' ');
}
