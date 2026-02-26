// Mirrors packages/backend/utils/types/services.types.ts
// If BE types change, update this file accordingly.

export type PriceLevel = { price: string; size: string };

export type AggregatedLevel = PriceLevel & {
    venue: "polymarket" | "kalshi" | "both";
};

export type VenueBook = { bids: PriceLevel[]; asks: PriceLevel[] };

export type AggregatedBook = {
    bids: AggregatedLevel[];
    asks: AggregatedLevel[];
    polymarket: VenueBook;
    kalshi: VenueBook;
    updatedAt: string;
    polymarketUpdatedAt?: string;
    kalshiUpdatedAt?: string;
    snapshotAt?: string;
};
