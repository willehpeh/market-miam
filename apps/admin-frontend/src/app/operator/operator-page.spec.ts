import { TestBed } from '@angular/core/testing';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';
import { InvitationFacade } from '../invitations/invitation.facade';
import { FakeInvitationFacade } from '../invitations/fake.invitation.facade';
import { AccountsFacade } from '../accounts/accounts.facade';
import { FakeAccountsFacade } from '../accounts/fake.accounts.facade';
import { OperatorPage } from './operator-page';
import { OperatorPageObject } from './operator-page.po';


describe('OperatorPage', () => {
  let auth: FakeAuthFacade;
  let invitations: FakeInvitationFacade;
  let accounts: FakeAccountsFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OperatorPage],
      providers: [
        { provide: AuthFacade, useClass: FakeAuthFacade },
        { provide: InvitationFacade, useClass: FakeInvitationFacade },
        { provide: AccountsFacade, useClass: FakeAccountsFacade },
      ],
    });
    auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
    invitations = TestBed.inject(InvitationFacade) as FakeInvitationFacade;
    accounts = TestBed.inject(AccountsFacade) as FakeAccountsFacade;
  });

  async function signedIn(): Promise<OperatorPageObject> {
    const page = await OperatorPageObject.open();
    await page.signIn();
    return page;
  }

  it('offers to sign in when no one is, without calling the API', async () => {
    const page = await OperatorPageObject.open();

    expect(page.offersSignIn()).toBe(true);
    expect(accounts.loads).toBe(0);
  });

  it('says it is loading while the sign-in is still pending', async () => {
    auth.status.set('pending');

    const page = await OperatorPageObject.open();

    expect(page.says('Loading')).toBe(true);
    expect(page.offersSignIn()).toBe(false);
  });

  it('starts the sign-in when asked', async () => {
    const page = await OperatorPageObject.open();

    await page.signIn();

    expect(auth.loginStarted).toBe(true);
  });

  it('shows who is signed in', async () => {
    const page = await signedIn();

    expect(page.says(FakeAuthFacade.USER_ID)).toBe(true);
  });

  it('asks for the accounts once someone is signed in, not before', async () => {
    const page = await OperatorPageObject.open();
    expect(accounts.loads).toBe(0);

    await page.signIn();

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
    expect(page.storefrontLink('acme.marketmiam.fr')).toBe('https://acme.marketmiam.fr');
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
    const page = await signedIn();

    expect(page.says('No accounts')).toBe(true);
  });

  it('says so when the accounts cannot be loaded', async () => {
    accounts.failed.set(true);

    const page = await signedIn();

    expect(page.says('The accounts could not be loaded')).toBe(true);
  });

  it('says it is loading the accounts', async () => {
    accounts.loading.set(true);

    const page = await signedIn();

    expect(page.says('Loading accounts')).toBe(true);
  });

  it('says so when the API refuses the sign-in, and offers no invitation', async () => {
    accounts.refused.set(true);

    const page = await signedIn();

    expect(page.says('The API refused this sign-in')).toBe(true);
    expect(page.offersInvitation()).toBe(false);
  });

  it('signs out', async () => {
    const page = await signedIn();

    await page.signOut();

    expect(auth.loggedOut).toBe(true);
  });

  it('invites the vendor whose address is typed', async () => {
    const page = await signedIn();

    await page.invite('marie@example.com');

    expect(invitations.invited).toEqual(['marie@example.com']);
  });

  it('lets no one press Invite while an invitation is sending', async () => {
    const page = await signedIn();
    expect(page.canInvite()).toBe(true);

    invitations.sending.set(true);
    await page.settle();

    expect(page.canInvite()).toBe(false);
  });

  it.each([
    ['email-in-use', 'An account already holds this address'],
    ['invalid-email', "That isn't a valid email address"],
    ['not-sent', "The invitation couldn't be sent. Try again."],
  ] as const)('says why an invitation was refused (%s), keeping the address to correct or retry', async (refusal, message) => {
    const page = await signedIn();
    await page.invite('owner@acme.test');

    invitations.refusal.set(refusal);
    await page.settle();

    expect(page.says(message)).toBe(true);
    expect(page.addressTyped()).toBe('owner@acme.test');
  });

  it('says whom the invitation went to, and clears the address for the next', async () => {
    const page = await signedIn();
    await page.invite('marie@example.com');

    invitations.sentTo.set('marie@example.com');
    await page.settle();

    expect(page.says('Invitation sent to marie@example.com')).toBe(true);
    expect(page.addressTyped()).toBe('');
  });
});
