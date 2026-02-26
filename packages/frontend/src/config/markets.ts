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
    {
        id: "mock-btc-100k",
        label: "Will BTC reach $100k by end of 2025?",
        conditionId: "mock-btc-100k",
        kalshiTicker: "MOCK-BTC-100K",
    },
    {
        id: "mock-fed-cut",
        label: "Will the Fed cut rates in Q2 2025?",
        conditionId: "mock-fed-cut",
        kalshiTicker: "MOCK-FED-Q2",
    },
    {
        id: "mock-ai-safety",
        label: "Will a major AI safety bill pass in 2025?",
        conditionId: "mock-ai-safety",
        kalshiTicker: "MOCK-AI-BILL-25",
    },
];
