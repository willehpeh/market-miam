import { Injectable } from '@angular/core';
import { Share } from './share';

@Injectable()
export class FakeShare extends Share {
  outcome: 'shared' | 'copied' | null = 'shared';
  offered: { title: string; url: string } | null = null;

  async link(title: string, url: string): Promise<'shared' | 'copied' | null> {
    this.offered = { title, url };
    return this.outcome;
  }
}
