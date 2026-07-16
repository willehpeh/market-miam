import { PublishStorefront } from '@market-miam/market-days';

export class TestPublishStorefront {
  static valid(): PublishStorefront {
    return new PublishStorefront('vendor-id');
  }
}
