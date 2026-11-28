import baseConfig, { behaviourNeverChosenByType, domainObjectsExposeNoAccessors, spansOnlyThroughTraced } from '../../eslint.config.mjs';

const commandBusOnlyInTheGateway = {
  name: '@nestjs/cqrs',
  importNames: ['CommandBus'],
  message: 'Dispatch commands through CommandGateway; only tracing/command-gateway.ts may import CommandBus.',
};

const orderingAsksMarketDaysOnlyWhatItsContractNames = {
  name: '@market-miam/market-days',
  allowImportNames: ['IsStorefrontPublished', 'FindVendorPublishingAt', 'FindLiveMarketDay', 'LiveMarketDay', 'LiveDish'],
  message: 'Ordering reaches Market Days only through the queries Market Days offers it; add the query to this list when the contract grows.',
};

const marketDaysKnowsNothingOfOrdering = {
  name: '@market-miam/ordering',
  message: 'Market Days is upstream of Ordering and never depends on it.',
};

const restrictedImports = (...paths) => ({ 'no-restricted-imports': ['error', { paths: [commandBusOnlyInTheGateway, ...paths] }] });

export default [
  ...baseConfig,
  domainObjectsExposeNoAccessors,
  {
    // Commands must be dispatched through CommandGateway, so every command
    // is uniformly traced. Importing the raw bus anywhere else bypasses the
    // span — make that a build error rather than a review concern.
    files: ['**/*.ts'],
    rules: restrictedImports(),
  },
  {
    files: ['src/app/ordering/**/*.ts'],
    rules: {
      ...restrictedImports(orderingAsksMarketDaysOnlyWhatItsContractNames),
      'no-restricted-syntax': ['error', spansOnlyThroughTraced, ...behaviourNeverChosenByType],
    },
  },
  {
    files: ['src/app/market-days/**/*.ts'],
    rules: restrictedImports(marketDaysKnowsNothingOfOrdering),
  },
  {
    files: ['src/app/event-sourcing/tracing/command-gateway.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
