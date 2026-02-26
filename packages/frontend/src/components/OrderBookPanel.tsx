"use client";

import { BookTable } from "./BookTable";
import { DepthChart } from "./DepthChart";
import { SpreadBand } from "./SpreadBand";
import type { VenueStatus } from "@/hooks/useOrderbook";
import { formatSize } from "@/lib/format";
import type { AggregatedBook, AggregatedLevel, PriceLevel } from "@/lib/types";
import { useRef, useState } from "react";

type ViewMode = "combined" | "polymarket" | "kalshi";
type Perspective = "YES" | "NO";

type Props = {
    book: AggregatedBook | null;
    isConnecting: boolean;
    polyStatus?: VenueStatus;
    kalshiStatus?: VenueStatus;
    polyLastUpdated?: number;
    kalshiLastUpdated?: number;
    polyMessageCount?: number;
    kalshiMessageCount?: number;
    updatesPerSec?: number;
    snapshotAt?: string | null;
    reconnectAttempt?: number;
    filledPrices?: Set<string>;
    quoteSide?: "YES" | "NO";
};

function toAggregatedLevels(
    levels: PriceLevel[],
    venue: "polymarket" | "kalshi",
): AggregatedLevel[] {
    return levels.map((l) => ({ ...l, venue }));
}

function bestPrice(
    levels: PriceLevel[],
    dir: "bid" | "ask",
): string | undefined {
    if (levels.length === 0) return undefined;
    const sorted = [...levels].sort((a, b) =>
        dir === "bid"
            ? parseFloat(b.price) - parseFloat(a.price)
            : parseFloat(a.price) - parseFloat(b.price),
    );
    return sorted[0]?.price;
}

/** Invert levels for NO perspective: price → (1 - price) */
function invertLevels(levels: AggregatedLevel[]): AggregatedLevel[] {
    return levels.map((l) => ({
        ...l,
        price: (1 - parseFloat(l.price)).toFixed(4),
    }));
}

function SkeletonRows({ count = 8 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-px px-3 py-1">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="h-[26px] animate-pulse rounded bg-zinc-800"
                    style={{ opacity: 1 - i * 0.08 }}
                />
            ))}
        </div>
    );
}

function depthSum(levels: AggregatedLevel[], topN = 10): number {
    return levels
        .slice(0, topN)
        .reduce((acc, l) => acc + parseFloat(l.size), 0);
}

const VIEW_MODES: ViewMode[] = ["combined", "polymarket", "kalshi"];
const VIEW_LABELS: Record<ViewMode, string> = {
    combined: "Combined",
    polymarket: "Polymarket",
    kalshi: "Kalshi",
};

const DEGRADED: VenueStatus[] = ["stale", "reconnecting", "offline"];

export function OrderBookPanel({
    book,
    isConnecting,
    polyStatus,
    kalshiStatus,
    polyLastUpdated,
    kalshiLastUpdated,
    polyMessageCount,
    kalshiMessageCount,
    updatesPerSec,
    snapshotAt,
    reconnectAttempt = 0,
    filledPrices,
    quoteSide,
}: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("combined");
    const [perspective, setPerspective] = useState<Perspective>("YES");
    const [paused, setPaused] = useState(false);

    // Freeze the displayed book while the user hovers — keep latest in a ref
    const frozenBook = useRef<AggregatedBook | null>(null);
    if (!paused) frozenBook.current = book;
    const displayBook = paused ? frozenBook.current : book;

    // Derive active bids/asks for the selected view
    const rawBids: AggregatedLevel[] = !displayBook
        ? []
        : viewMode === "combined"
          ? displayBook.bids
          : toAggregatedLevels(
                viewMode === "polymarket"
                    ? displayBook.polymarket.bids
                    : displayBook.kalshi.bids,
                viewMode,
            );

    const rawAsks: AggregatedLevel[] = !displayBook
        ? []
        : viewMode === "combined"
          ? displayBook.asks
          : toAggregatedLevels(
                viewMode === "polymarket"
                    ? displayBook.polymarket.asks
                    : displayBook.kalshi.asks,
                viewMode,
            );

    // For NO perspective: invert prices and swap sides
    const activeBids =
        perspective === "NO"
            ? invertLevels(rawAsks).sort(
                  (a, b) => parseFloat(b.price) - parseFloat(a.price),
              )
            : rawBids;
    const activeAsks =
        perspective === "NO"
            ? invertLevels(rawBids).sort(
                  (a, b) => parseFloat(a.price) - parseFloat(b.price),
              )
            : rawAsks;

    const bestBid = activeBids[0];
    const bestAsk = activeAsks[0];

    // Per-venue bests — always from raw venue books
    const polyBestBid = displayBook
        ? bestPrice(displayBook.polymarket.bids, "bid")
        : undefined;
    const polyBestAsk = displayBook
        ? bestPrice(displayBook.polymarket.asks, "ask")
        : undefined;
    const kalshiBestBid = displayBook
        ? bestPrice(displayBook.kalshi.bids, "bid")
        : undefined;
    const kalshiBestAsk = displayBook
        ? bestPrice(displayBook.kalshi.asks, "ask")
        : undefined;

    // Depth imbalance (top 10 levels of the raw YES view)
    const bidDepth = depthSum(rawBids);
    const askDepth = depthSum(rawAsks);
    const totalDepth = bidDepth + askDepth;
    const imbalancePct =
        totalDepth > 0
            ? Math.round(((bidDepth - askDepth) / totalDepth) * 100)
            : 0;

    // Degradation banner — differentiate stale vs offline per venue
    type BannerInfo = {
        venue: string;
        message: string;
        color: "yellow" | "red";
    };
    const banners: BannerInfo[] = [];
    const checkVenue = (status: VenueStatus | undefined, venue: string) => {
        if (status === "stale" || status === "reconnecting") {
            const suffix =
                reconnectAttempt > 0
                    ? ` (attempt ${reconnectAttempt}/5)`
                    : " — reconnecting…";
            banners.push({
                venue,
                message: `${venue} updates delayed — using last known book.${reconnectAttempt > 0 ? suffix : ""}`,
                color: "yellow",
            });
        } else if (status === "offline") {
            const other = venue === "Polymarket" ? "Kalshi" : "Polymarket";
            banners.push({
                venue,
                message: `${venue} unavailable — displaying ${other} only.`,
                color: "red",
            });
        }
    };
    checkVenue(polyStatus, "Polymarket");
    checkVenue(kalshiStatus, "Kalshi");

    const totalLevels = displayBook
        ? displayBook.bids.length + displayBook.asks.length
        : 0;

    // §2.3 Aggregated liquidity advantage — compare combined top-5 depth vs solo venues
    const TOP_N = 5;
    const sortDesc = (a: { price: string }, b: { price: string }) =>
        parseFloat(b.price) - parseFloat(a.price);
    const sortAsc = (a: { price: string }, b: { price: string }) =>
        parseFloat(a.price) - parseFloat(b.price);
    const sumDepth = (levels: { size: string }[], n: number) =>
        levels.slice(0, n).reduce((acc, l) => acc + parseFloat(l.size), 0);

    let liquidityAdvantage: string | null = null;
    if (displayBook) {
        const combBid5 = sumDepth(rawBids, TOP_N);
        const combAsk5 = sumDepth(rawAsks, TOP_N);
        const polyBid5 = sumDepth(
            [...displayBook.polymarket.bids].sort(sortDesc),
            TOP_N,
        );
        const kalshiBid5 = sumDepth(
            [...displayBook.kalshi.bids].sort(sortDesc),
            TOP_N,
        );
        const polyAsk5 = sumDepth(
            [...displayBook.polymarket.asks].sort(sortAsc),
            TOP_N,
        );
        const kalshiAsk5 = sumDepth(
            [...displayBook.kalshi.asks].sort(sortAsc),
            TOP_N,
        );

        // Pick the side and weaker venue that shows the most improvement
        const bidVsKalshi =
            kalshiBid5 > 0 ? ((combBid5 - kalshiBid5) / kalshiBid5) * 100 : 0;
        const bidVsPoly =
            polyBid5 > 0 ? ((combBid5 - polyBid5) / polyBid5) * 100 : 0;
        const askVsKalshi =
            kalshiAsk5 > 0 ? ((combAsk5 - kalshiAsk5) / kalshiAsk5) * 100 : 0;
        const askVsPoly =
            polyAsk5 > 0 ? ((combAsk5 - polyAsk5) / polyAsk5) * 100 : 0;

        const candidates = [
            { pct: bidVsKalshi, label: "bid depth vs Kalshi alone" },
            { pct: bidVsPoly, label: "bid depth vs Polymarket alone" },
            { pct: askVsKalshi, label: "ask depth vs Kalshi alone" },
            { pct: askVsPoly, label: "ask depth vs Polymarket alone" },
        ].filter((c) => c.pct > 5); // only show if >5% improvement

        if (candidates.length > 0) {
            const best = candidates.reduce((a, b) => (a.pct > b.pct ? a : b));
            liquidityAdvantage = `+${best.pct.toFixed(0)}% deeper within ${TOP_N} ticks ${best.label}`;
        }
    }

    return (
        <div
            className="rounded-xl border border-white/8 bg-zinc-900"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Degradation banners */}
            {banners.map((b) => (
                <div
                    key={b.venue}
                    className={`flex items-center gap-2 rounded-t-xl border-b px-4 py-2 text-[11px] first:rounded-t-xl ${
                        b.color === "red"
                            ? "border-red-500/20 bg-red-500/5 text-red-400"
                            : "border-yellow-500/20 bg-yellow-500/5 text-yellow-400"
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 animate-pulse rounded-full ${b.color === "red" ? "bg-red-400" : "bg-yellow-400"}`}
                    />
                    {b.message}
                </div>
            ))}

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                        Order Book
                    </h2>
                    {paused && (
                        <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-zinc-400">
                            PAUSED
                        </span>
                    )}
                </div>
                {/* YES / NO perspective toggle */}
                <div className="flex gap-0.5 rounded border border-white/8 p-0.5">
                    {(["YES", "NO"] as Perspective[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPerspective(p)}
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                                perspective === p
                                    ? p === "YES"
                                        ? "bg-green-500/20 text-green-300"
                                        : "bg-red-500/20 text-red-300"
                                    : "text-zinc-600 hover:text-zinc-400"
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* View mode tabs */}
            <div className="flex gap-1 border-b border-white/6 px-3 py-2">
                {VIEW_MODES.map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`rounded px-2 py-0.5 font-mono text-[11px] tracking-wider uppercase transition-colors ${
                            viewMode === mode
                                ? "bg-white/10 text-white"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        {VIEW_LABELS[mode]}
                    </button>
                ))}
            </div>

            {/* Column labels */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-zinc-600 uppercase">
                <span className="w-14">Price</span>
                <span className="flex-1 text-right">Size</span>
                <span className="w-10 text-right">Venue</span>
            </div>

            {isConnecting && !displayBook ? (
                <>
                    <SkeletonRows />
                    <div className="border-y border-white/8 py-2 text-center font-mono text-xs text-zinc-700">
                        —
                    </div>
                    <SkeletonRows />
                </>
            ) : (
                <div>
                    {/* Asks — fixed height anchored to bottom so SpreadBand never shifts.
                        Overflow clips at the top when more rows appear. */}
                    <div className="relative h-[220px] overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0">
                            <BookTable
                                levels={activeAsks}
                                side="ask"
                                reversed={true}
                                venueBooks={displayBook ?? undefined}
                                filledPrices={
                                    quoteSide === "YES"
                                        ? filledPrices
                                        : undefined
                                }
                            />
                        </div>
                    </div>

                    <SpreadBand
                        bestBid={bestBid}
                        bestAsk={bestAsk}
                        polyBestBid={polyBestBid}
                        polyBestAsk={polyBestAsk}
                        kalshiBestBid={kalshiBestBid}
                        kalshiBestAsk={kalshiBestAsk}
                        polyLastUpdated={polyLastUpdated}
                        kalshiLastUpdated={kalshiLastUpdated}
                        polyMessageCount={polyMessageCount}
                        kalshiMessageCount={kalshiMessageCount}
                        updatesPerSec={updatesPerSec}
                        snapshotAt={snapshotAt}
                        liquidityAdvantage={liquidityAdvantage}
                    />

                    {/* Bids — fixed height, overflow clips at bottom so top (near spread) stays stable */}
                    <div className="h-[220px] overflow-hidden">
                        <BookTable
                            levels={activeBids}
                            side="bid"
                            venueBooks={displayBook ?? undefined}
                            filledPrices={
                                quoteSide === "NO" ? filledPrices : undefined
                            }
                        />
                    </div>
                </div>
            )}

            {/* Cumulative depth chart */}
            {displayBook && (rawBids.length > 0 || rawAsks.length > 0) && (
                <DepthChart bids={rawBids} asks={rawAsks} />
            )}

            {/* Depth imbalance row */}
            {displayBook && totalDepth > 0 && (
                <div className="flex items-center justify-between border-t border-white/6 px-4 py-2 font-mono text-[10px] text-zinc-600">
                    <span>
                        Bid{" "}
                        <span className="text-green-400/60">
                            {formatSize(bidDepth.toFixed(0))}
                        </span>
                    </span>
                    <span
                        className={
                            imbalancePct > 0
                                ? "text-green-400/70"
                                : imbalancePct < 0
                                  ? "text-red-400/70"
                                  : "text-zinc-600"
                        }
                    >
                        {imbalancePct > 0 ? "+" : ""}
                        {imbalancePct}% imbalance
                    </span>
                    <span>
                        Ask{" "}
                        <span className="text-red-400/60">
                            {formatSize(askDepth.toFixed(0))}
                        </span>
                    </span>
                </div>
            )}

            {/* Memory guard */}
            {displayBook && (
                <div className="flex justify-end border-t border-white/4 px-4 py-1.5 font-mono text-[10px] text-zinc-700">
                    Levels {totalLevels} / 50 max
                </div>
            )}
        </div>
    );
}
