import { Auth0TokenVerifier, InvalidTokenError } from '@market-monster/auth';
import { VendorId } from '@market-monster/shared-kernel';
import { Email } from '@market-monster/common';
import { SigningKey } from './signing-key';
import { AUDIENCE, EMAIL, ISSUER, TestAccessToken, VENDOR_ID } from './test-access-token';

const PAST = 1000; // seconds since epoch — comfortably expired

describe('Auth0 token verification', () => {
  let signing: SigningKey;
  let verifier: Auth0TokenVerifier;

  beforeEach(async () => {
    signing = await SigningKey.generate();
    verifier = new Auth0TokenVerifier(ISSUER, AUDIENCE, signing.jwks());
  });

  it('verifies a well-formed token and returns the vendor', async () => {
    const token = await signing.sign(TestAccessToken.valid());

    await expect(verifier.verify(token)).resolves.toEqual({
      vendorId: new VendorId(VENDOR_ID),
      email: new Email(EMAIL),
    });
  });

  it.each([
    { scenario: 'an expired token', claims: TestAccessToken.with({ expiresAt: PAST }) },
    { scenario: 'a wrong audience', claims: TestAccessToken.with({ audience: 'https://someone-else' }) },
    { scenario: 'a wrong issuer', claims: TestAccessToken.with({ issuer: 'https://impostor.auth0.com/' }) },
    { scenario: 'a missing vendorId claim', claims: TestAccessToken.with({ vendorId: undefined }) },
    { scenario: 'a missing email claim', claims: TestAccessToken.with({ email: undefined }) },
  ])('rejects $scenario', async ({ claims }) => {
    const token = await signing.sign(claims);

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects a token signed by an unknown key', async () => {
    const impostor = await SigningKey.generate('impostor-key');
    const token = await impostor.sign(TestAccessToken.valid());

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects a string that is not a JWT', async () => {
    await expect(verifier.verify('not.a.jwt')).rejects.toThrow(InvalidTokenError);
  });
});
