import type {
    KalshiBookState,
    KalshiMessage,
    KalshiOrderbookDelta,
    KalshiOrderbookSnapshot,
    PriceLevel,
    VenueBook,
} from "../utils/types/services.types";
import { LoggerService } from "./logger.service";
import WebSocket from "ws";

const KALSHI_WS_URL = "wss://api.elections.kalshi.com/trade-api/ws/v2";

export class KalshiService {
    private static logger = LoggerService.scoped("KalshiService");

    private ticker: string;
    private ws: WebSocket | null = null;
    private bookState: KalshiBookState = { yes: new Map(), no: new Map() };
    private onUpdate: (book: VenueBook) => void;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    constructor(ticker: string, onUpdate: (book: VenueBook) => void) {
        this.ticker = ticker;
        this.onUpdate = onUpdate;
    }

    public start(): void {
        KalshiService.logger.info("starting", { ticker: this.ticker });
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
        // YES side: bids = yes prices (buyers of YES), asks = no prices converted
        // Kalshi YES price p means NO price is (100-p).
        // We expose the YES book: bids sorted desc, asks sorted asc.
        const bids = this.sortedLevels(this.bookState.yes, "desc");
        const asks = this.sortedLevels(this.bookState.no, "asc", true);
        return { bids, asks };
    }

    private connect(): void {
        const headers: Record<string, string> = {};
        const apiKey = process.env.KALSHI_API_KEY;
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

        const ws = new WebSocket(KALSHI_WS_URL, { headers });
        this.ws = ws;

        ws.on("open", () => {
            KalshiService.logger.info("connected");
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
            KalshiService.logger.warn("disconnected");
            if (!this.stopped) this.scheduleReconnect();
        });

        ws.on("error", (err) => {
            KalshiService.logger.error("ws-error", { message: err.message });
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
        this.onUpdate(this.getBook());
    }

    // Convert cent-keyed map to normalised PriceLevel[]
    // invertPrice=true converts NO price to equivalent YES ask price (100-p)
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
            KalshiService.logger.info("reconnecting");
            this.connect();
        }, 3000);
    }
}
