import baseConfig, { domainObjectsExposeNoAccessors, spansOnlyThroughTraced } from '../../eslint.config.mjs';

const appendsOnlyThroughVendorScopedEvents = {
  selector: "MemberExpression[property.name='append']",
  message:
    'Appending outside VendorScopedEvents loses the vendorId metadata erasure keys off; save through a vendor-scoped repository.',
};

const noticesBelongToNoVendor = ['src/payment-account-notices/payment-account-notices.ts'];

export default [
  ...baseConfig,
  domainObjectsExposeNoAccessors,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', spansOnlyThroughTraced, appendsOnlyThroughVendorScopedEvents],
    },
  },
  {
    files: noticesBelongToNoVendor,
    rules: {
      'no-restricted-syntax': ['error', spansOnlyThroughTraced],
    },
  },
];
