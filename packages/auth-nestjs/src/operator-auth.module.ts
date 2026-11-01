import { DynamicModule, FactoryProvider, Module } from '@nestjs/common';
import { OperatorTokenVerifier } from '@market-miam/auth';
import { OperatorAuthGuard } from './operator-auth.guard';

export interface OperatorAuthModuleAsyncOptions {
  useFactory: FactoryProvider<OperatorTokenVerifier | Promise<OperatorTokenVerifier>>['useFactory'];
  inject?: FactoryProvider['inject'];
}

/**
 * The operator counterpart of {@link AuthModule}: binds the app's
 * {@link OperatorTokenVerifier} and pairs it with {@link OperatorAuthGuard}. Kept
 * separate so the vendor and operator verifiers never share a binding.
 */
@Module({})
export class OperatorAuthModule {
  static forRootAsync(options: OperatorAuthModuleAsyncOptions): DynamicModule {
    return {
      module: OperatorAuthModule,
      global: true,
      providers: [
        {
          provide: OperatorTokenVerifier,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        OperatorAuthGuard,
      ],
      exports: [OperatorTokenVerifier, OperatorAuthGuard],
    };
  }
}
