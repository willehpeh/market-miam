import { InjectionToken } from '@angular/core';

// ponytail: how long "Lien copié" stands in for the Partager label.
export const COPIED_NOTICE_DELAY = new InjectionToken<number>('share.copiedNoticeDelay', {
  factory: () => 2000,
});

/**
 * Hands a link to whatever the device passes links around with — the share sheet on a
 * phone, the clipboard where there is no sheet (desktop Firefox, plain HTTP). Backing
 * out of the sheet and a refused clipboard both come back as nothing happening, because
 * to the vendor they are the same: they chose not to share, or nothing was shared.
 */
export abstract class Share {
  abstract link(title: string, url: string): Promise<'shared' | 'copied' | null>;
}
