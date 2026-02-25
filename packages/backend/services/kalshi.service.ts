import type {
    KalshiBookState,
    KalshiMessage,
    KalshiOrderbookDelta,
    KalshiOrderbookSnapshot,
    PriceLevel,
    VenueBook,
} from "../utils/types/services.types";
import { LoggerService } from "./logger.service";
import "dotenv/config";
import WebSocket from "ws";

const KALSHI_WS_URL = "wss://api.elections.kalshi.com/trade-api/ws/v2";

export class KalshiService {
    private static logger = LoggerService.scoped("KalshiService");
    private static instances = new Map<string, KalshiService>();
    private static apiKey: string | undefined = process.env.KALSHI_API_KEY;

    private ticker: string;
    private ws: WebSocket | null = null;
    private bookState: KalshiBookState = { yes: new Map(), no: new Map() };
    private listeners = new Set<(book: VenueBook) => void>();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    private constructor(ticker: string) {
        this.ticker = ticker;
    }

    public static getOrCreate(ticker: string): KalshiService {
        if (!this.instances.has(ticker)) {
            const svc = new KalshiService(ticker);
            this.instances.set(ticker, svc);
            svc.start();
            this.logger.info("singleton-created", { ticker });
        }
        return this.instances.get(ticker)!;
    }

    public addListener(cb: (book: VenueBook) => void): void {
        this.listeners.add(cb);
    }

    public removeListener(cb: (book: VenueBook) => void): void {
        this.listeners.delete(cb);
        if (this.listeners.size === 0) {
            KalshiService.logger.info("no-listeners-stopping", {
                ticker: this.ticker,
            });
            this.stop();
            KalshiService.instances.delete(this.ticker);
        }
    }

    public getBook(): VenueBook {
        const bids = this.sortedLevels(this.bookState.yes, "desc");
        const asks = this.sortedLevels(this.bookState.no, "asc", true);
        return { bids, asks };
    }

    private start(): void {
        if (!KalshiService.apiKey) {
            KalshiService.logger.error("api-key-not-found", {
                ticker: this.ticker,
            });
            return;
        }
        KalshiService.logger.info("starting", { ticker: this.ticker });
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
        const headers: Record<string, string> = {};
        headers["Authorization"] = `Bearer ${KalshiService.apiKey}`;

        const ws = new WebSocket(KALSHI_WS_URL, { headers });
        this.ws = ws;

        ws.on("open", () => {
            KalshiService.logger.info("connected", { ticker: this.ticker });
            ws.send(
                JSON.stringify({
                    id: 1,
                    cmd: "subscribe",
                    params: {
                        channels: ["orderbook_delta"],
                        market_tickers: [this.ticker],
                    },
                }),
            );
        });

        ws.on("message", (raw) => {
            try {
                const msg: KalshiMessage = JSON.parse(raw.toString());
                this.handleMessage(msg);
            } catch {
                // ignore malformed frames
            }
        });

        ws.on("close", () => {
            KalshiService.logger.warn("disconnected", { ticker: this.ticker });
            if (!this.stopped) this.scheduleReconnect();
        });

        ws.on("error", (err) => {
            KalshiService.logger.error("ws-error", {
                ticker: this.ticker,
                message: err.message,
            });
        });
    }

    private handleMessage(msg: KalshiMessage): void {
        if (msg.type === "orderbook_snapshot") {
            const m = msg as KalshiOrderbookSnapshot;
            this.bookState.yes.clear();
            this.bookState.no.clear();
            for (const [price, qty] of m.msg.yes) {
                if (qty > 0) this.bookState.yes.set(price, qty);
            }
            for (const [price, qty] of m.msg.no) {
                if (qty > 0) this.bookState.no.set(price, qty);
            }
            this.emit();
        } else if (msg.type === "orderbook_delta") {
            const m = msg as KalshiOrderbookDelta;
            const map =
                m.msg.side === "yes" ? this.bookState.yes : this.bookState.no;
            const current = map.get(m.msg.price) ?? 0;
            const next = current + m.msg.delta;
            if (next <= 0) {
                map.delete(m.msg.price);
            } else {
                map.set(m.msg.price, next);
            }
            this.emit();
        }
    }

    private emit(): void {
        const book = this.getBook();
        for (const cb of this.listeners) cb(book);
    }

    private sortedLevels(
        map: Map<number, number>,
        dir: "asc" | "desc",
        invertPrice = false,
    ): PriceLevel[] {
        return Array.from(map.entries())
            .filter(([, qty]) => qty > 0)
            .map(([priceCents, qty]) => ({
                price: (
                    (invertPrice ? 100 - priceCents : priceCents) / 100
                ).toFixed(2),
                size: qty.toString(),
            }))
            .sort((a, b) =>
                dir === "desc"
                    ? parseFloat(b.price) - parseFloat(a.price)
                    : parseFloat(a.price) - parseFloat(b.price),
            );
    }

    private scheduleReconnect(): void {
        this.reconnectTimer = setTimeout(() => {
            KalshiService.logger.info("reconnecting", { ticker: this.ticker });
            this.connect();
        }, 3000);
    }
}
