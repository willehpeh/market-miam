import { Lineage } from '../ports/lineage';

export class LineageDispatcher {
  constructor(
    private readonly lineage: Lineage,
    private readonly generateId: () => string,
  ) {}

  dispatch<T>(inner: () => T): T {
    const rootId = this.generateId();
    return this.lineage.run({ correlationId: rootId, causationId: rootId }, inner);
  }
}
