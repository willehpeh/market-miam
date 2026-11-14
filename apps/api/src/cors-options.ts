import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { sourceCodeHeader } from './source-code-offer';

const anyMarketMiamSubdomain = /^https:\/\/([a-z0-9-]+\.)?marketmiam\.fr$/;

export const MARKET_MIAM_CORS_SETUP: CorsOptions = {
  origin: [anyMarketMiamSubdomain, 'http://localhost:4200'],
  exposedHeaders: [sourceCodeHeader]
};
