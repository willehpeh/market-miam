import { StorefrontViewModel } from './storefront-view-model';

// Decision 26: one expression gates the customer takeover and the customer poll, in its
// slice-1 form — the featured day is running and carries a menu. Read entirely from
// server-said fields (decision 21), and extracted so the poll's gate is drivable without
// fake timers (decision 32b). An absent day arrives with its menu suppressed, so
// cancellation needs no clause of its own.
export const broadcasting = (view: StorefrontViewModel | null): boolean => {
  if (view?.status !== 'published') {
    return false;
  }
  const featured = view.upcomingMarkets[0];
  return !!featured && featured.inProgress && featured.items.length > 0;
};
