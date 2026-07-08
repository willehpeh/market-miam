import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // Commands must be dispatched through CommandGateway, so every command
    // is uniformly traced. Importing the raw bus anywhere else bypasses the
    // span — make that a build error rather than a review concern.
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@nestjs/cqrs',
              importNames: ['CommandBus'],
              message:
                'Dispatch commands through CommandGateway; only tracing.command-gateway.ts may import CommandBus.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/event-sourcing/tracing.command-gateway.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
