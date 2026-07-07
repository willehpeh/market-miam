import { DynamicModule, FactoryProvider, Module } from '@nestjs/common';
import { TokenVerifier } from '@market-miam/auth';
import { JwtAuthGuard } from './jwt-auth.guard';

export interface AuthModuleAsyncOptions {
  useFactory: FactoryProvider<TokenVerifier | Promise<TokenVerifier>>['useFactory'];
  inject?: FactoryProvider['inject'];
}

/**
 * Reusable NestJS integration for token-based auth. The consuming app constructs
 * a {@link TokenVerifier} in its composition root and supplies it via `useFactory`;
 * this module binds it as a singleton and pairs it with the guard. The library
 * depends only on the port, never on a concrete verifier or the app's config.
 */
@Module({})
export class AuthModule {
  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      providers: [
        {
          provide: TokenVerifier,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        JwtAuthGuard,
      ],
      exports: [TokenVerifier, JwtAuthGuard],
    };
  }
}
