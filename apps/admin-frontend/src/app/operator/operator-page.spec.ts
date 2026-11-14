import { screen } from '@testing-library/angular';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';
import { FakeInvitationFacade } from '../invitations/fake.invitation.facade';
import { FakeAccountsFacade } from '../accounts/fake.accounts.facade';
import { FakeErasureFacade } from '../erasures/fake.erasure.facade';
import { OperatorPageObject } from './operator-page.page-object';

describe('OperatorPage', () => {
  let auth: FakeAuthFacade;
  let invitations: FakeInvitationFacade;
  let accounts: FakeAccountsFacade;
  let erasures: FakeErasureFacade;

  beforeEach(() => {
    auth = new FakeAuthFacade();
    invitations = new FakeInvitationFacade();
    accounts = new FakeAccountsFacade();
    erasures = new FakeErasureFacade();
  });

  function open(): Promise<OperatorPageObject> {
    return OperatorPageObject.render({ auth, invitations, accounts, erasures });
  }

  async function signedIn(): Promise<OperatorPageObject> {
    return (await open()).signIn();
  }

  it('offers to sign in when no one is, without calling the API', async () => {
    const page = await open();

    expect(page.signInButton()).toBeInTheDocument();
    expect(accounts.loads).toBe(0);
  });

  it('says it is loading while the sign-in is still pending', async () => {
    auth.status.set('pending');

    const page = await open();

    expect(screen.getByText('Loading', { exact: false })).toBeInTheDocument();
    expect(page.querySignInButton()).not.toBeInTheDocument();
  });

  it('starts the sign-in when asked', async () => {
    const page = await open();

    page.signIn();

    expect(auth.loginStarted).toBe(true);
  });

  it('shows who is signed in', async () => {
    await signedIn();

    expect(screen.getByText(FakeAuthFacade.USER_ID, { exact: false })).toBeInTheDocument();
  });

  it('asks for the accounts once someone is signed in, not before', async () => {
    const page = await open();
    expect(accounts.loads).toBe(0);

    page.signIn();

    expect(accounts.loads).toBe(1);
  });

  it('lists each account with its storefront and its vendor id', async () => {
    accounts.accounts.set([
      { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' },
      { email: 'owner@brioche.test', vendorId: 'brioche-co', subdomain: null },
    ]);

    const page = await signedIn();

    expect(page.accounts()).toEqual([
      'owner@acme.test acme.marketmiam.fr acme-bakery',
      'owner@brioche.test no subdomain brioche-co',
    ]);
    expect(page.storefrontLink('acme.marketmiam.fr')).toHaveAttribute('href', 'https://acme.marketmiam.fr');
  });

  it('marks an account that is not a vendor, and one without an email', async () => {
    accounts.accounts.set([
      { email: 'operator@marketmiam.test', vendorId: null, subdomain: null },
      { email: null, vendorId: 'no-email-vendor', subdomain: null },
    ]);

    const page = await signedIn();

    expect(page.accounts()).toEqual([
      'operator@marketmiam.test not a vendor',
      'no email no subdomain no-email-vendor',
    ]);
  });

  // Its account opens once the processor has run (ADR 0060): until then it is an invitation.
  it('shows an invited vendor as invited, with its vendor id', async () => {
    accounts.accounts.set([{ email: 'marie@example.com', vendorId: 'new-vendor', subdomain: null, invited: true }]);

    const page = await signedIn();

    expect(page.accounts()).toEqual(['marie@example.com invited new-vendor']);
  });

  it('says when there are no accounts', async () => {
    await signedIn();

    expect(screen.getByText('No accounts', { exact: false })).toBeInTheDocument();
  });

  it('says so when the accounts cannot be loaded', async () => {
    accounts.failed.set(true);

    await signedIn();

    expect(screen.getByText('The accounts could not be loaded', { exact: false })).toBeInTheDocument();
  });

  it('says it is loading the accounts', async () => {
    accounts.loading.set(true);

    await signedIn();

    expect(screen.getByText('Loading accounts', { exact: false })).toBeInTheDocument();
  });

  it('says so when the API refuses the sign-in, and offers no invitation', async () => {
    accounts.refused.set(true);

    const page = await signedIn();

    expect(screen.getByText('The API refused this sign-in', { exact: false })).toBeInTheDocument();
    expect(page.queryAddressField()).not.toBeInTheDocument();
  });

  it('signs out', async () => {
    const page = await signedIn();

    page.signOut();

    expect(auth.loggedOut).toBe(true);
  });

  it('invites the vendor whose address is typed', async () => {
    const page = await signedIn();

    await page.invite('marie@example.com');

    expect(invitations.invited).toEqual(['marie@example.com']);
  });

  it('lets no one press Invite while an invitation is sending', async () => {
    const page = await signedIn();
    expect(page.inviteButton()).toBeEnabled();

    invitations.sending.set(true);
    page.detectChanges();

    expect(page.inviteButton()).toBeDisabled();
  });

  it.each([
    ['email-in-use', 'An account already holds this address'],
    ['invalid-email', "That isn't a valid email address"],
    ['not-sent', "The invitation couldn't be sent. Try again."],
  ] as const)('says why an invitation was refused (%s), keeping the address to correct or retry', async (refusal, message) => {
    const page = await signedIn();
    await page.invite('owner@acme.test');

    invitations.refusal.set(refusal);
    page.detectChanges();

    expect(screen.getByText(message, { exact: false })).toBeInTheDocument();
    expect(page.addressField()).toHaveValue('owner@acme.test');
  });

  it('says whom the invitation went to, and clears the address for the next', async () => {
    const page = await signedIn();
    await page.invite('marie@example.com');

    invitations.sentTo.set('marie@example.com');
    page.detectChanges();

    expect(screen.getByText('Invitation sent to marie@example.com', { exact: false })).toBeInTheDocument();
    expect(page.addressField()).toHaveValue('');
  });

  // Erasure cannot be undone (ADR 0058): the operator confirms it before it goes.
  it('erases a vendor once the operator confirms', async () => {
    accounts.accounts.set([{ email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' }]);
    const page = await signedIn();

    page.askToErase('owner@acme.test').confirmErasure();

    expect(erasures.erased).toEqual(['acme-bakery']);
  });
});
