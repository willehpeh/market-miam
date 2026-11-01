// Development: requests stay relative and proxy.conf.json sends /api to the local api,
// which fakes operator sign-in. Auth0 is not used (see provideAuth).
export const environment = {
  apiBaseUrl: '',
  auth0: {
    domain: 'willalexander.eu.auth0.com',
    clientId: 'MARKET_MIAM_ADMIN_CLIENT_ID',
    audience: 'https://api.marketmiam.fr/ops',
  },
};
