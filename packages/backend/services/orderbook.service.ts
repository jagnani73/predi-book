import type {
    AggregatedBook,
    PriceLevel,
    VenueBook,
} from "../utils/types/services.types";
import { KalshiService } from "./kalshi.service";
import { LoggerService } from "./logger.service";
import { PolymarketService } from "./polymarket.service";

const logger = LoggerService.scoped("OrderbookService");

type AggregatedLevel = PriceLevel & { venue: "polymarket" | "kalshi" | "both" };

/**
 * Manages a single aggregated order book for one market pair.
 * Holds two venue WS connections and merges their books on every update.
 */
export class OrderbookService {
    private polymarket: PolymarketService;
    private kalshi: KalshiService;
    private polymarketBook: VenueBook = { bids: [], asks: [] };
    private kalshiBook: VenueBook = { bids: [], asks: [] };
    private onUpdate: (book: AggregatedBook) => void;
    private conditionId: string;
    private kalshiTicker: string;

    constructor(
        conditionId: string,
        kalshiTicker: string,
        onUpdate: (book: AggregatedBook) => void,
    ) {
        this.conditionId = conditionId;
        this.kalshiTicker = kalshiTicker;
        this.onUpdate = onUpdate;

        this.polymarket = new PolymarketService(conditionId, (book) => {
            this.polymarketBook = book;
            this.emit();
        });

        this.kalshi = new KalshiService(kalshiTicker, (book) => {
            this.kalshiBook = book;
            this.emit();
        });
    }

    public async start(): Promise<void> {
        logger.info("starting", {
            conditionId: this.conditionId,
            kalshiTicker: this.kalshiTicker,
        });
        this.kalshi.start();
        await this.polymarket.start(); // needs async REST call first
    }

    public stop(): void {
        logger.info("stopping", {
            conditionId: this.conditionId,
            kalshiTicker: this.kalshiTicker,
        });
        this.polymarket.stop();
        this.kalshi.stop();
    }

    public getAggregatedBook(): AggregatedBook {
        return {
            bids: this.mergeLevels(
                this.polymarketBook.bids,
                this.kalshiBook.bids,
                "desc",
            ),
            asks: this.mergeLevels(
                this.polymarketBook.asks,
                this.kalshiBook.asks,
                "asc",
            ),
            polymarket: this.polymarketBook,
            kalshi: this.kalshiBook,
            updatedAt: new Date().toISOString(),
        };
    }

    private emit(): void {
        this.onUpdate(this.getAggregatedBook());
    }

    /**
     * Merge two sorted level arrays into one, combining sizes at the same price.
     */
    private mergeLevels(
        polyLevels: PriceLevel[],
        kalshiLevels: PriceLevel[],
        dir: "asc" | "desc",
    ): AggregatedLevel[] {
        const merged = new Map<
            string,
            { polySize: number; kalshiSize: number }
        >();

        for (const l of polyLevels) {
            const entry = merged.get(l.price) ?? { polySize: 0, kalshiSize: 0 };
            entry.polySize += parseFloat(l.size);
            merged.set(l.price, entry);
        }

        for (const l of kalshiLevels) {
            const entry = merged.get(l.price) ?? { polySize: 0, kalshiSize: 0 };
            entry.kalshiSize += parseFloat(l.size);
            merged.set(l.price, entry);
        }

        return Array.from(merged.entries())
            .map(([price, { polySize, kalshiSize }]) => {
                const totalSize = polySize + kalshiSize;
                const venue: AggregatedLevel["venue"] =
                    polySize > 0 && kalshiSize > 0
                        ? "both"
                        : polySize > 0
                          ? "polymarket"
                          : "kalshi";

                return {
                    price,
                    size: totalSize.toFixed(2),
                    venue,
                };
            })
            .sort((a, b) =>
                dir === "desc"
                    ? parseFloat(b.price) - parseFloat(a.price)
                    : parseFloat(a.price) - parseFloat(b.price),
            );
    }
}
