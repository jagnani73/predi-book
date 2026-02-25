import type { Namespace, Socket } from "socket.io";

// ------------------------------
// WSS
// ------------------------------

export type NamespaceName = "orderbook";

export interface NamespaceRooms {
    rooms: Map<string, Set<string>>; // room -> Set<socketId>
    socketRooms: Map<string, Set<string>>; // socketId -> Set<room>
    roomCleanups: Map<string, () => void>; // room -> cleanup callback (called when room empties)
}

export interface SocketRoutes {
    namespace: NamespaceName;
    routes: (socket: Socket, io: Namespace) => void;
}

// ------------------------------
// Orderbook
// ------------------------------

export type PriceLevel = {
    price: string; // 0–1 as string (e.g. "0.65")
    size: string;  // USDC size as string
};

export type VenueBook = {
    bids: PriceLevel[];
    asks: PriceLevel[];
};

export type AggregatedLevel = PriceLevel & { venue: "polymarket" | "kalshi" | "both" };

export type AggregatedBook = {
    bids: AggregatedLevel[];
    asks: AggregatedLevel[];
    polymarket: VenueBook;
    kalshi: VenueBook;
    updatedAt: string; // ISO timestamp
};

export type SubscribeOrderbookEvent = {
    type: "subscribe";
    payload: {
        conditionId: string;  // Polymarket condition ID
        kalshiTicker: string; // Kalshi market ticker
    };
};

export type EmitOrderbookEvent = {
    type: "data";
    payload: AggregatedBook;
};

// ------------------------------
// Kalshi
// ------------------------------
export type KalshiOrderbookSnapshot = {
    type: "orderbook_snapshot";
    msg: {
        market_ticker: string;
        yes: [number, number][]; // [price_cents, quantity]
        no: [number, number][];
    };
};

export type KalshiOrderbookDelta = {
    type: "orderbook_delta";
    msg: {
        market_ticker: string;
        price: number;       // cents
        delta: number;       // signed quantity change
        side: "yes" | "no";
    };
};

export type KalshiMessage =
    | KalshiOrderbookSnapshot
    | KalshiOrderbookDelta
    | { type: string };

export type KalshiBookState = {
    yes: Map<number, number>; // price_cents -> qty
    no: Map<number, number>;
};

// ------------------------------
// Polymarket
// ------------------------------
export type BookLevel = {
    price: string; size: string
};

export type PolymarketBookMessage = {
    event_type: "book";
    asset_id: string;
    bids: BookLevel[];
    asks: BookLevel[];
    timestamp: string;
};

export type PolymarketPriceChangeMessage = {
    event_type: "price_change";
    asset_id: string;
    changes: {
        price: string;
        side: "BUY" | "SELL"; size: string
    }[];
};

export type PolymarketMessage =
    | PolymarketBookMessage
    | PolymarketPriceChangeMessage
    | {
        event_type: string;
    };

export type PolymarketMarketInfo = {
    conditionId: string;
    question: string;
    tokens: {
        token_id: string;
        outcome: string
    }[];
};

export type PolymarketBookState = {
    bids: Map<string, string>; asks: Map<string, string>
};
