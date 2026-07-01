import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@market-monster/auth-nestjs';
import { MarketDaysModule } from './market-days/market-days.module';
import { tokenVerifierFor } from './token-verifier.factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: tokenVerifierFor,
    }),
    MarketDaysModule,
  ],
})
export class AppModule {}
