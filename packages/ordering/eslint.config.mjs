import baseConfig from '../../eslint.config.mjs';

const noticesBelongToNoVendor = ['src/payment-account-notices/payment-account-notices.ts'];

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='append']",
          message:
            'Appending outside VendorScopedEvents loses the vendorId metadata erasure keys off; save through a vendor-scoped repository.',
        },
      ],
    },
  },
  {
    files: noticesBelongToNoVendor,
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
