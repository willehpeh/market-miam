// A transaction boundary a subscription can wrap work in, without knowing what's
// underneath. The default is a no-op (`none()`) that just runs the work — so the
// in-memory profile and every existing construction site behave exactly as before;
// the postgres profile swaps in a real ambient transaction.
export abstract class UnitOfWork {
  abstract transaction<T>(fn: () => Promise<T>): Promise<T>;

  static none(): UnitOfWork {
    return noOp;
  }
}

class NoOpUnitOfWork extends UnitOfWork {
  transaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

const noOp = new NoOpUnitOfWork();
