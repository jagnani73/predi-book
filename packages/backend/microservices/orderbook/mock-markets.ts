import type { VenueBook } from "../../utils/types/services.types";

export const MOCK_MARKETS: Record<
    string,
    { label: string; kalshiTicker: string }
> = {
    "mock-btc-100k": {
        label: "Will BTC reach $100k by end of 2025?",
        kalshiTicker: "MOCK-BTC-100K",
    },
    "mock-fed-cut": {
        label: "Will the Fed cut rates in Q2 2025?",
        kalshiTicker: "MOCK-FED-Q2",
    },
    "mock-ai-safety": {
        label: "Will a major AI safety bill pass in 2025?",
        kalshiTicker: "MOCK-AI-BILL-25",
    },
};

export function isMockMarket(conditionId: string): boolean {
    return conditionId in MOCK_MARKETS;
}

/**
 * Generates a pair of venue books centred around `centre` with slight random
 * noise on each call — simulates a live, slowly-moving order book.
 */
export function generateMockBooks(centre = 0.62): {
    polyBook: VenueBook;
    kalshiBook: VenueBook;
} {
    const jitter = () => (Math.random() - 0.5) * 0.01; // ±0.5¢ noise
    const size = () => (Math.random() * 900 + 100).toFixed(0); // 100–1000

    const polyBids = [0.03, 0.05, 0.08].map((d) => ({
        price: Math.max(0.01, centre - d + jitter()).toFixed(4),
        size: size(),
    }));
    const polyAsks = [0.02, 0.04, 0.07].map((d) => ({
        price: Math.min(0.99, centre + d + jitter()).toFixed(4),
        size: size(),
    }));
    const kalshiBids = [0.04, 0.06].map((d) => ({
        price: Math.max(0.01, centre - d + jitter()).toFixed(4),
        size: size(),
    }));
    const kalshiAsks = [0.03, 0.06].map((d) => ({
        price: Math.min(0.99, centre + d + jitter()).toFixed(4),
        size: size(),
    }));

    return {
        polyBook: { bids: polyBids, asks: polyAsks },
        kalshiBook: { bids: kalshiBids, asks: kalshiAsks },
    };
}
