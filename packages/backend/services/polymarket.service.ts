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
    private static instances = new Map<string, PolymarketService>();

    private conditionId: string;
    private tokenIds: string[] = [];
    private ws: WebSocket | null = null;
    private bookState: PolymarketBookState = {
        bids: new Map(),
        asks: new Map(),
    };
    private listeners = new Set<(book: VenueBook) => void>();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    private constructor(conditionId: string) {
        this.conditionId = conditionId;
    }

    public static async getOrCreate(
        conditionId: string,
    ): Promise<PolymarketService> {
        if (!this.instances.has(conditionId)) {
            const svc = new PolymarketService(conditionId);
            this.instances.set(conditionId, svc);
            await svc.start();
            this.logger.info("singleton-created", { conditionId });
        }
        return this.instances.get(conditionId)!;
    }

    public addListener(cb: (book: VenueBook) => void): void {
        this.listeners.add(cb);
    }

    public removeListener(cb: (book: VenueBook) => void): void {
        this.listeners.delete(cb);
        if (this.listeners.size === 0) {
            PolymarketService.logger.info("no-listeners-stopping", {
                conditionId: this.conditionId,
            });
            this.stop();
            PolymarketService.instances.delete(this.conditionId);
        }
    }

    public getBook(): VenueBook {
        return {
            bids: this.sortedLevels(this.bookState.bids, "desc"),
            asks: this.sortedLevels(this.bookState.asks, "asc"),
        };
    }

    private async start(): Promise<void> {
        const info = await PolymarketService.fetchMarketInfo(this.conditionId);
        const yesToken =
            info.tokens.find((t) => t.outcome === "Yes") ?? info.tokens[0];
        this.tokenIds = [yesToken.token_id];

        PolymarketService.logger.info("starting", {
            conditionId: this.conditionId,
            tokenId: yesToken.token_id,
        });

        this.stopped = false;
        this.connect();
    }

    private stop(): void {
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }

    private connect(): void {
        const ws = new WebSocket(CLOB_WS_URL);
        this.ws = ws;

        ws.on("open", () => {
            PolymarketService.logger.info("connected", {
                conditionId: this.conditionId,
            });
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
            PolymarketService.logger.warn("disconnected", {
                conditionId: this.conditionId,
            });
            if (!this.stopped) this.scheduleReconnect();
        });

        ws.on("error", (err) => {
            PolymarketService.logger.error("ws-error", {
                conditionId: this.conditionId,
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
        const book = this.getBook();
        for (const cb of this.listeners) cb(book);
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
            PolymarketService.logger.info("reconnecting", {
                conditionId: this.conditionId,
            });
            this.connect();
        }, 3000);
    }

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
