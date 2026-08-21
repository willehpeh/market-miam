// What the dashboard prompt renders and nothing else (decision 65): a day to name, and the
// two halves of the link to its bilan. No menu, no prices, no phase — the prompt says
// *judge this market*, and the bilan screen reads the day itself when the vendor arrives.
export type UnratedMarketDay = {
  marketId: string;
  date: string;
  day: string;
  marketName: string;
};

export type UnratedMarketDaysView = {
  marketDays: UnratedMarketDay[];
};
