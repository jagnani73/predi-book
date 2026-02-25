export type MarketConfig = {
    id: string;
    label: string;
    conditionId: string;
    kalshiTicker: string;
};

/**
 * Curated list of Polymarket + Kalshi market pairs.
 * Add entries manually — see README or IMPLEMENTATION_PLAN.md for how to find IDs.
 *
 * Polymarket conditionId: GET https://clob.polymarket.com/markets?active=true
 * Kalshi ticker: visible in the Kalshi market URL (e.g. kalshi.com/markets/KXFED-26MAR-T525)
 */
export const MARKETS: MarketConfig[] = [
    // Example (replace with real pairs):
    // {
    //     id: "fed-mar-2026",
    //     label: "Will the Fed cut rates in March 2026?",
    //     conditionId: "0x...",
    //     kalshiTicker: "KXFED-26MAR-T525",
    // },
];
