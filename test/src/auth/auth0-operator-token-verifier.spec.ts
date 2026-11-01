import { Auth0OperatorTokenVerifier, InvalidTokenError, NotAnOperatorError } from '@market-miam/auth';
import { SigningKey } from './signing-key';
import { OPERATOR_ID, OPS_AUDIENCE, OPS_ISSUER, TestOperatorToken } from './test-operator-token';

const PAST = 1000; // seconds since epoch — comfortably expired

describe('Auth0 operator token verification', () => {
  let signing: SigningKey;
  let verifier: Auth0OperatorTokenVerifier;

  beforeEach(async () => {
    signing = await SigningKey.generate();
    verifier = new Auth0OperatorTokenVerifier(OPS_ISSUER, OPS_AUDIENCE, signing.jwks());
  });

  it('verifies an operator token and returns the operator', async () => {
    const token = await signing.signOperator(TestOperatorToken.valid());

    await expect(verifier.verify(token)).resolves.toEqual({ operatorId: OPERATOR_ID });
  });

  it.each([
    { scenario: 'an expired token', claims: TestOperatorToken.with({ expiresAt: PAST }) },
    { scenario: "the vendor API's audience", claims: TestOperatorToken.with({ audience: 'https://api.market-miam' }) },
    { scenario: 'a wrong issuer', claims: TestOperatorToken.with({ issuer: 'https://impostor.auth0.com/' }) },
    { scenario: 'a missing subject', claims: TestOperatorToken.with({ subject: undefined }) },
  ])('rejects $scenario as invalid', async ({ claims }) => {
    const token = await signing.signOperator(claims);

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
  });

  it.each([
    { scenario: 'no permissions claim', permissions: undefined },
    { scenario: 'no permissions', permissions: [] },
    { scenario: 'other permissions only', permissions: ['read:vendors'] },
    { scenario: 'a permissions claim that is not a list', permissions: 'operate' },
  ])('refuses a genuine token with $scenario as not an operator', async ({ permissions }) => {
    const token = await signing.signOperator(TestOperatorToken.with({ permissions }));

    await expect(verifier.verify(token)).rejects.toThrow(NotAnOperatorError);
  });

  it('rejects a token signed by an unknown key', async () => {
    const impostor = await SigningKey.generate('impostor-key');
    const token = await impostor.signOperator(TestOperatorToken.valid());

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects a string that is not a JWT', async () => {
    await expect(verifier.verify('not.a.jwt')).rejects.toThrow(InvalidTokenError);
  });
});
