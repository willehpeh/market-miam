// Default (production) build-time configuration. The development build swaps in
// environment.development.ts (see project.json's fileReplacements).
export const environment = {
  apiBaseUrl: 'https://api.marketmiam.fr',
  auth0: {
    domain: 'willalexander.eu.auth0.com',
    // The Market Miam Admin application. A client id is public, not a secret.
    clientId: 'MARKET_MIAM_ADMIN_CLIENT_ID',
    audience: 'https://api.marketmiam.fr/ops',
  },
};
