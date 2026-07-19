import { Storefront } from '../storefront/storefront';
import { StorefrontNotReadyToPublish } from '../storefront/storefront-not-ready-to-publish.error';
import { Catalogue } from '../catalogue';
import { Calendar } from '../calendar';

export class StorefrontPublication {
  publish(storefront: Storefront, catalogue: Catalogue, calendar: Calendar, hasSubdomain: boolean): void {
    const missing: string[] = [];
    if (!storefront.hasTitle()) missing.push('title');
    if (!storefront.hasDescription()) missing.push('description');
    if (!storefront.hasCoverPhoto()) missing.push('cover');
    if (!catalogue.hasAtLeastOneItem()) missing.push('catalogue');
    if (!calendar.hasAtLeastOneSchedule()) missing.push('schedule');
    if (!hasSubdomain) missing.push('url');
    if (missing.length > 0) {
      throw new StorefrontNotReadyToPublish(missing);
    }
    storefront.publish();
  }
}
