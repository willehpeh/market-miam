import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // Commands must be dispatched through CommandDispatcher, so every command
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
                'Dispatch commands through CommandDispatcher; only tracing.command-dispatcher.ts may import CommandBus.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/event-sourcing/tracing.command-dispatcher.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
