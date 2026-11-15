import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  // Erasure, shredding and the spans' vendor.id find a vendor's events by the vendorId in their
  // metadata, which only the shared kernel's VendorScopedEvents stamps. So, as in Market Days, a
  // vendor's aggregates save through a vendor-scoped repository and nothing here appends directly.
  // Stripe's notices, named after Stripe's event rather than a vendor (ADR 0067), will need a
  // door of their own when they land.
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
