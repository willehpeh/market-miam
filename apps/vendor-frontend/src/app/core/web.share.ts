import { Injectable } from '@angular/core';
import { Share } from './share';

@Injectable()
export class WebShare extends Share {
  async link(title: string, url: string): Promise<'shared' | 'copied' | null> {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return 'shared';
      }
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return null;
    }
  }
}
