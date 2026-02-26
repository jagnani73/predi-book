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

// Module-level centre drifts gradually over time (§8.3)
let mockCentre = 0.62;

/**
 * Generates a pair of venue books with gradual price drift, variable depth
 * levels, and occasional order removal — simulates a live, slowly-moving book.
 */
export function generateMockBooks(): {
    polyBook: VenueBook;
    kalshiBook: VenueBook;
} {
    // §8.3 — drift centre slightly each call, clamp to [0.15, 0.85]
    mockCentre += (Math.random() - 0.5) * 0.002;
    mockCentre = Math.max(0.15, Math.min(0.85, mockCentre));

    const size = () => (Math.random() * 900 + 100).toFixed(0);

    // §8.1 — variable depth levels per venue
    const polyDepth = Math.floor(Math.random() * 4) + 2; // 2–5
    const kalshiDepth = Math.floor(Math.random() * 3) + 2; // 2–4

    // Polymarket has an exclusive best level (0.02); inner levels are shared
    // with Kalshi so fills walk across both venues on larger orders.
    const polyOffsets = [0.02, 0.04, 0.06, 0.08, 0.11].slice(0, polyDepth);
    const kalshiOffsets = [0.04, 0.06, 0.08, 0.12].slice(0, kalshiDepth);

    // Round to prediction-market tick (0.01) so shared offsets produce identical
    // price strings — mergeLevels then tags them as "both" venue levels.
    const px = (raw: number) =>
        parseFloat(
            Math.max(0.01, Math.min(0.99, raw)).toFixed(2),
        ).toFixed(2);

    let polyBids = polyOffsets.map((d) => ({
        price: px(mockCentre - d),
        size: size(),
    }));
    let polyAsks = polyOffsets.map((d) => ({
        price: px(mockCentre + d),
        size: size(),
    }));
    let kalshiBids = kalshiOffsets.map((d) => ({
        price: px(mockCentre - d),
        size: size(),
    }));
    let kalshiAsks = kalshiOffsets.map((d) => ({
        price: px(mockCentre + d),
        size: size(),
    }));

    // §8.2 — 15% chance to drop one random level per venue side
    const maybeRemove = <T>(arr: T[]): T[] => {
        if (arr.length > 1 && Math.random() < 0.15) {
            const idx = Math.floor(Math.random() * arr.length);
            return arr.filter((_, i) => i !== idx);
        }
        return arr;
    };
    polyBids = maybeRemove(polyBids);
    polyAsks = maybeRemove(polyAsks);
    kalshiBids = maybeRemove(kalshiBids);
    kalshiAsks = maybeRemove(kalshiAsks);

    return {
        polyBook: { bids: polyBids, asks: polyAsks },
        kalshiBook: { bids: kalshiBids, asks: kalshiAsks },
    };
}
