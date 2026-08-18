import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  // Erasure and shredding find a vendor's events by the vendorId in their metadata,
  // and VendorScopedEvents.save is the only place that stamp is written. An append
  // reaching the store by any other route produces events that look fine and are
  // invisible to erasure, so this package has exactly one door to append. Scoped
  // here rather than at the root: the frontends append to FormData, and the api
  // specs seed streams through the store on purpose.
  {
    files: ['**/*.ts'],
    ignores: ['src/vendor-scoped-events.ts'],
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
