// Default (production) build-time configuration. The development build swaps in
// environment.development.ts (see project.json's fileReplacements).
export const environment = {
  apiBaseUrl: 'https://api.marketmiam.fr',
  auth0: {
    domain: 'willalexander.eu.auth0.com',
    // The Market Miam Admin application. A client id is public, not a secret.
    clientId: 'xyMOLIElAGrS460vQr5xWT0zQ5BjBqH0',
    audience: 'https://api.marketmiam.fr/ops',
  },
};
