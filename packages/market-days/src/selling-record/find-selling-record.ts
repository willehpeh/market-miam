import { Query } from '@nestjs/cqrs';
import { SellingRecordView } from './selling-record-view';

// What the bilan says once there are several of them. The whole set in one read: three
// surfaces slice it — the menu editor's line, the per-market page and the per-dish
// transpose (BILAN-RETROSPECTIVE-PLAN.md decision 3).
export class FindSellingRecord extends Query<SellingRecordView> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
