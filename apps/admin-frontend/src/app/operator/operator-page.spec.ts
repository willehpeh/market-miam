import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Auth } from '../core/auth/auth';
import { FakeAuth } from '../core/auth/fake.auth';
import { InvitationFacade } from '../invitations/invitation.facade';
import { FakeInvitationFacade } from '../invitations/fake.invitation.facade';
import { OperatorPage } from './operator-page';
import { OperatorPageObject } from './operator-page.po';

const WHOAMI = (url: string) => url.endsWith('/api/ops/whoami');
const ACCOUNTS = (url: string) => url.endsWith('/api/ops/accounts');

describe('OperatorPage', () => {
  let auth: FakeAuth;
  let http: HttpTestingController;
  let invitations: FakeInvitationFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OperatorPage],
      providers: [
        { provide: Auth, useClass: FakeAuth },
        { provide: InvitationFacade, useClass: FakeInvitationFacade },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(Auth) as FakeAuth;
    http = TestBed.inject(HttpTestingController);
    invitations = TestBed.inject(InvitationFacade) as FakeInvitationFacade;
  });

  afterEach(() => {
    // The account list is AccountList's to test; here it only has to be answered, unless
    // the page took it away (signing out) and so cancelled its request.
    http
      .match((req) => ACCOUNTS(req.url))
      .filter((req) => !req.cancelled)
      .forEach((req) => req.flush([]));
    http.verify();
  });

  // Signed in, and confirmed as an operator by the API: the page then shows the accounts and the form.
  async function signedIn(): Promise<OperatorPageObject> {
    const page = await OperatorPageObject.open();
    await page.signIn();
    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
    await page.settle();
    return page;
  }

  it('offers to sign in when no one is, without calling the API', async () => {
    const page = await OperatorPageObject.open();

    expect(page.offersSignIn()).toBe(true);
    http.expectNone((req) => WHOAMI(req.url));
  });

  it('starts the sign-in when asked', async () => {
    const page = await OperatorPageObject.open();

    await page.signIn();

    expect(auth.loginStarted).toBe(true);
    // The fake signs in at once, so the page goes on to ask the API.
    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
  });

  it('shows who the API says is signed in', async () => {
    const page = await signedIn();

    expect(page.says('github|1234567')).toBe(true);
  });

  it('lists the accounts once the API has confirmed the operator', async () => {
    const page = await OperatorPageObject.open();
    await page.signIn();
    http.expectNone((req) => ACCOUNTS(req.url));

    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
    await page.settle();
    http.expectOne((req) => ACCOUNTS(req.url)).flush([
      { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' },
    ]);
    await page.settle();

    expect(page.says('owner@acme.test')).toBe(true);
  });

  it('says so when the API refuses the sign-in, and asks it for nothing more', async () => {
    const page = await OperatorPageObject.open();
    await page.signIn();

    http.expectOne((req) => WHOAMI(req.url)).flush(null, { status: 403, statusText: 'Forbidden' });
    await page.settle();

    expect(page.says('The API refused this sign-in')).toBe(true);
    http.expectNone((req) => ACCOUNTS(req.url));
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
