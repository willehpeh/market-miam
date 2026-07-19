// Empty base URL keeps requests relative under test, so HttpTestingController
// matches paths without a host.
export const environment = {
  apiBaseUrl: '',
  cloudinary: { cloudName: 'test-cloud' },
  storefrontBaseDomain: 'marketmiam.fr',
};
