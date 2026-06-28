import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@market-monster/auth-nestjs';
import { Auth0TokenVerifier } from '@market-monster/auth';
import { MarketDaysModule } from './market-days/market-days.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Auth0TokenVerifier(
          config.getOrThrow<string>('AUTH0_ISSUER'),
          config.getOrThrow<string>('AUTH0_AUDIENCE'),
        ),
    }),
    MarketDaysModule,
  ],
})
export class AppModule {}
