import type {
    PolymarketBookMessage,
    PolymarketBookState,
    PolymarketMarketInfo,
    PolymarketMessage,
    PolymarketPriceChangeMessage,
    PriceLevel,
    VenueBook,
} from "../utils/types/services.types";
import { LoggerService } from "./logger.service";
import WebSocket from "ws";

const CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const CLOB_REST_URL = "https://clob.polymarket.com";

export class PolymarketService {
    private static logger = LoggerService.scoped("PolymarketService");

    private conditionId: string;
    private tokenIds: string[] = [];
    private ws: WebSocket | null = null;
    private bookState: PolymarketBookState = {
        bids: new Map(),
        asks: new Map(),
    };
    private onUpdate: (book: VenueBook) => void;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    constructor(conditionId: string, onUpdate: (book: VenueBook) => void) {
        this.conditionId = conditionId;
        this.onUpdate = onUpdate;
    }

    public async start(): Promise<void> {
        const info = await PolymarketService.fetchMarketInfo(this.conditionId);
        // Use the YES token (outcome index 0) for the order book
        const yesToken =
            info.tokens.find((t) => t.outcome === "Yes") ?? info.tokens[0];
        this.tokenIds = [yesToken.token_id];

        PolymarketService.logger.info("starting", {
            conditionId: this.conditionId,
            tokenId: yesToken.token_id,
        });

        this.connect();
    }

    public stop(): void {
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }

    public getBook(): VenueBook {
        return {
            bids: this.sortedLevels(this.bookState.bids, "desc"),
            asks: this.sortedLevels(this.bookState.asks, "asc"),
        };
    }

    private connect(): void {
        const ws = new WebSocket(CLOB_WS_URL);
        this.ws = ws;

        ws.on("open", () => {
            PolymarketService.logger.info("connected");
            ws.send(
                JSON.stringify({
                    assets_ids: this.tokenIds,
                    type: "Market",
                }),
            );
        });

        ws.on("message", (raw) => {
            try {
                const messages: PolymarketMessage[] = JSON.parse(
                    raw.toString(),
                );
                for (const msg of messages) {
                    this.handleMessage(msg);
                }
            } catch {
                // ignore malformed frames
            }
        });

        ws.on("close", () => {
            PolymarketService.logger.warn("disconnected");
            if (!this.stopped) this.scheduleReconnect();
        });

        ws.on("error", (err) => {
            PolymarketService.logger.error("ws-error", {
                message: err.message,
            });
        });
    }

    private handleMessage(msg: PolymarketMessage): void {
        if (msg.event_type === "book") {
            const m = msg as PolymarketBookMessage;
            this.bookState.bids.clear();
            this.bookState.asks.clear();
            for (const l of m.bids) this.bookState.bids.set(l.price, l.size);
            for (const l of m.asks) this.bookState.asks.set(l.price, l.size);
            this.emit();
        } else if (msg.event_type === "price_change") {
            const m = msg as PolymarketPriceChangeMessage;
            for (const change of m.changes) {
                const map =
                    change.side === "BUY"
                        ? this.bookState.bids
                        : this.bookState.asks;
                if (change.size === "0") {
                    map.delete(change.price);
                } else {
                    map.set(change.price, change.size);
                }
            }
            this.emit();
        }
    }

    private emit(): void {
        this.onUpdate(this.getBook());
    }

    private sortedLevels(
        map: Map<string, string>,
        dir: "asc" | "desc",
    ): PriceLevel[] {
        return Array.from(map.entries())
            .filter(([, size]) => parseFloat(size) > 0)
            .sort(([a], [b]) =>
                dir === "desc"
                    ? parseFloat(b) - parseFloat(a)
                    : parseFloat(a) - parseFloat(b),
            )
            .map(([price, size]) => ({ price, size }));
    }

    private scheduleReconnect(): void {
        this.reconnectTimer = setTimeout(() => {
            PolymarketService.logger.info("reconnecting");
            this.connect();
        }, 3000);
    }

    // ------ Static helpers ------

    public static async fetchMarketInfo(
        conditionId: string,
    ): Promise<PolymarketMarketInfo> {
        const res = await fetch(`${CLOB_REST_URL}/markets/${conditionId}`);
        if (!res.ok) {
            throw new Error(
                `Polymarket CLOB REST error: ${res.status} ${res.statusText}`,
            );
        }
        const data = await res.json();
        return {
            conditionId: data.condition_id,
            question: data.question,
            tokens: data.tokens ?? [],
        };
    }
}
