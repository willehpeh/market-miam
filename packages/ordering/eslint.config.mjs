import baseConfig from '../../eslint.config.mjs';

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
];
