// The vendor's lifecycle, the order the event model's timeline follows (docs/EVENT-MODEL-PLAN.md).
// Only the order is kept by hand: every card is still derived from the tests and the declared
// seams. A slice is named by its directory under test/src/<context>/. A command placed twice
// names who sends it each time. An automation that sends commands is not listed: its gear
// sits over each command it sends. A slice missing from this list is shown under Unsorted,
// with a warning, until it is placed here.
export const STORY = [
  {
    stage: 'Invitation & sign-up',
    slices: [
      'invite-vendor',
      'record-vendor-account-opened',
      { slice: 'erase-vendor', by: 'automation' },
      'assign-subdomain',
      'register-vendor',
      'open-storefront',
    ],
  },
  { stage: 'Legal identity', slices: ['provide-vendor-legal-identity', 'vendor-legal-identity-view'] },
  {
    stage: 'Catalogue',
    slices: ['add-item-to-catalogue', 'revise-item', 'change-item-photo', 'reorder-items', 'retire-item', 'catalogue-view'],
  },
  {
    stage: 'Storefront',
    slices: [
      'edit-storefront-information',
      'set-storefront-cover-photo',
      'hide-carte-prices',
      'show-carte-prices',
      'publish-storefront',
      'vendor-storefront-view',
    ],
  },
  {
    stage: 'Payments',
    slices: [
      'start-payment-account-registration',
      'fail-payment-account-registration',
      'detect-payment-account-update',
      'observe-payment-account',
    ],
  },
  {
    stage: 'Schedule & prices',
    slices: [
      'register-market-schedule',
      'set-market-prices',
      'amend-market-schedule',
      'declare-absence',
      'cancel-market-schedule',
      'market-schedule-view',
      'market-prices-view',
    ],
  },
  {
    stage: 'Market day',
    slices: [
      'set-market-day-menu',
      'place-order',
      'mark-item-as-sold-out',
      'mark-item-as-available',
      'close-market-day',
      'reopen-market-day',
      'record-bilan',
      'market-day-view',
      'selling-record',
    ],
  },
  {
    stage: 'Leaving',
    slices: [{ slice: 'erase-vendor', by: 'operator' }, 'record-vendor-account-closed', 'erases-vendors'],
  },
];
