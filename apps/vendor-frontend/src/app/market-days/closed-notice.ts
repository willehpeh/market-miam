import { ChangeDetectionStrategy, Component } from '@angular/core';

// Decision 45's state, said the same way wherever the day renders (decision 53) — the card,
// the editor and the live screen all reach it. Louder than the En direct banner on purpose:
// decision 38 took the confirm dialog away, which leaves this as the only disclosure that a
// mistap just took the vendor out of every customer's list.
@Component({
  selector: 'mm-closed-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-4 rounded-card border-2 border-danger bg-danger-soft p-3">
      <p class="font-bold text-danger">Stand fermé</p>
      <p class="text-sm text-ink">Vos clients ne voient plus ce marché.</p>
    </div>
  `,
})
export class ClosedNotice {}
