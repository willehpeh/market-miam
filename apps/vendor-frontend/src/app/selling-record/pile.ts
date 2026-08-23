import { ItemOutcome } from '../market-days/market-days';
import { Bilan } from './selling-record';

// Named in market French rather than in the bilan form's neutral radio labels: a radio is a
// verdict the vendor is being asked to pronounce on their own morning, a pile is describing
// a stack of trays (BILAN-RETROSPECTIVE-PLAN.md decision 8).
// A closed set, so a surface that wants to treat the piles differently — the editor tints
// the three that are claims and leaves the two that are not — gets that checked rather than
// matching on loose strings.
export type PileName =
  | 'Toujours épuisé'
  | 'Ça part bien'
  | 'Ça reste'
  | 'Ça dépend des jours'
  | 'Trop tôt pour dire';

const NAMES: Record<ItemOutcome, PileName> = {
  sold_out: 'Toujours épuisé',
  did_well: 'Ça part bien',
  did_not_do_well: 'Ça reste',
};

const ENOUGH_TO_CLAIM = 3;

// The whole rule, in one place, because it is a UX threshold the pilot is expected to move
// (decision 4). Undefined for a dish never brought to the market asked about: the absence
// has no single name — the menu editor stays silent, the record page calls it Jamais
// apporté ici — so each surface names it rather than this.
export function pile(bilans: Bilan[]): PileName | undefined {
  if (bilans.length === 0) {
    return undefined;
  }
  if (bilans.length < ENOUGH_TO_CLAIM) {
    return 'Trop tôt pour dire';
  }
  // Candidates in most-recent-first order, which is what breaks a tie: two outcomes can
  // both reach half, and the recent morning describes the clientele being packed for.
  const recentFirst = [...bilans].reverse().map((bilan) => bilan.outcome);
  const dominant = recentFirst.find((outcome) => count(bilans, outcome) * 2 >= bilans.length);
  return dominant ? NAMES[dominant] : 'Ça dépend des jours';
}

function count(bilans: Bilan[], outcome: ItemOutcome): number {
  return bilans.filter((bilan) => bilan.outcome === outcome).length;
}
