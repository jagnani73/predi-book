"use client"

import { useState } from "react"
import type { AggregatedBook, AggregatedLevel, PriceLevel } from "@/lib/types"
import type { VenueStatus } from "@/hooks/useOrderbook"
import { formatSize } from "@/lib/format"
import { BookTable } from "./BookTable"
import { DepthChart } from "./DepthChart"
import { SpreadBand } from "./SpreadBand"

type ViewMode = "combined" | "polymarket" | "kalshi"
type Perspective = "YES" | "NO"

type Props = {
    book: AggregatedBook | null
    isConnecting: boolean
    polyStatus?: VenueStatus
    kalshiStatus?: VenueStatus
    polyLastUpdated?: number
    kalshiLastUpdated?: number
    polyMessageCount?: number
    kalshiMessageCount?: number
    updatesPerSec?: number
    snapshotAt?: string | null
}

function toAggregatedLevels(
    levels: PriceLevel[],
    venue: "polymarket" | "kalshi",
): AggregatedLevel[] {
    return levels.map((l) => ({ ...l, venue }))
}

function bestPrice(
    levels: PriceLevel[],
    dir: "bid" | "ask",
): string | undefined {
    if (levels.length === 0) return undefined
    const sorted = [...levels].sort((a, b) =>
        dir === "bid"
            ? parseFloat(b.price) - parseFloat(a.price)
            : parseFloat(a.price) - parseFloat(b.price),
    )
    return sorted[0]?.price
}

/** Invert levels for NO perspective: price → (1 - price) */
function invertLevels(levels: AggregatedLevel[]): AggregatedLevel[] {
    return levels.map((l) => ({
        ...l,
        price: (1 - parseFloat(l.price)).toFixed(4),
    }))
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
    )
}

function depthSum(levels: AggregatedLevel[], topN = 10): number {
    return levels
        .slice(0, topN)
        .reduce((acc, l) => acc + parseFloat(l.size), 0)
}

const VIEW_MODES: ViewMode[] = ["combined", "polymarket", "kalshi"]
const VIEW_LABELS: Record<ViewMode, string> = {
    combined: "Combined",
    polymarket: "Polymarket",
    kalshi: "Kalshi",
}

const STALE_STATUSES: VenueStatus[] = ["stale", "reconnecting"]

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
}: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("combined")
    const [perspective, setPerspective] = useState<Perspective>("YES")

    // Derive active bids/asks for the selected view
    const rawBids: AggregatedLevel[] =
        !book
            ? []
            : viewMode === "combined"
              ? book.bids
              : toAggregatedLevels(
                    viewMode === "polymarket"
                        ? book.polymarket.bids
                        : book.kalshi.bids,
                    viewMode,
                )

    const rawAsks: AggregatedLevel[] =
        !book
            ? []
            : viewMode === "combined"
              ? book.asks
              : toAggregatedLevels(
                    viewMode === "polymarket"
                        ? book.polymarket.asks
                        : book.kalshi.asks,
                    viewMode,
                )

    // For NO perspective: invert prices and swap sides
    const activeBids =
        perspective === "NO"
            ? invertLevels(rawAsks).sort(
                  (a, b) => parseFloat(b.price) - parseFloat(a.price),
              )
            : rawBids
    const activeAsks =
        perspective === "NO"
            ? invertLevels(rawBids).sort(
                  (a, b) => parseFloat(a.price) - parseFloat(b.price),
              )
            : rawAsks

    const bestBid = activeBids[0]
    const bestAsk = activeAsks[0]

    // Per-venue bests — always from raw venue books
    const polyBestBid = book
        ? bestPrice(book.polymarket.bids, "bid")
        : undefined
    const polyBestAsk = book
        ? bestPrice(book.polymarket.asks, "ask")
        : undefined
    const kalshiBestBid = book
        ? bestPrice(book.kalshi.bids, "bid")
        : undefined
    const kalshiBestAsk = book
        ? bestPrice(book.kalshi.asks, "ask")
        : undefined

    // Depth imbalance (top 10 levels of the raw YES view)
    const bidDepth = depthSum(rawBids)
    const askDepth = depthSum(rawAsks)
    const totalDepth = bidDepth + askDepth
    const imbalancePct =
        totalDepth > 0
            ? Math.round(((bidDepth - askDepth) / totalDepth) * 100)
            : 0

    // Reconnect banner
    const polyStale = polyStatus && STALE_STATUSES.includes(polyStatus)
    const kalshiStale = kalshiStatus && STALE_STATUSES.includes(kalshiStatus)
    const staleBannerVenue = polyStale
        ? "Polymarket"
        : kalshiStale
          ? "Kalshi"
          : null

    const totalLevels = book ? book.bids.length + book.asks.length : 0

    return (
        <div className="rounded-xl border border-white/8 bg-zinc-900">
            {/* Reconnect banner */}
            {staleBannerVenue && (
                <div className="flex items-center gap-2 rounded-t-xl border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-[11px] text-yellow-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
                    {staleBannerVenue} connection stale — reconnecting…
                </div>
            )}

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Order Book
                </h2>
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
                        className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
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
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                <span className="w-14">Price</span>
                <span className="flex-1 text-right">Size</span>
                <span className="w-10 text-right">Venue</span>
            </div>

            {isConnecting && !book ? (
                <>
                    <SkeletonRows />
                    <div className="border-y border-white/8 py-2 text-center font-mono text-xs text-zinc-700">
                        —
                    </div>
                    <SkeletonRows />
                </>
            ) : (
                <>
                    {/* Asks — reversed so cheapest ask is at bottom (near spread) */}
                    <BookTable
                        levels={activeAsks}
                        side="ask"
                        reversed={true}
                        venueBooks={book ?? undefined}
                    />

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
                    />

                    {/* Bids — highest bid at top (near spread) */}
                    <BookTable
                        levels={activeBids}
                        side="bid"
                        venueBooks={book ?? undefined}
                    />
                </>
            )}

            {/* Cumulative depth chart */}
            {book && (rawBids.length > 0 || rawAsks.length > 0) && (
                <DepthChart bids={rawBids} asks={rawAsks} />
            )}

            {/* Depth imbalance row */}
            {book && totalDepth > 0 && (
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
            {book && (
                <div className="flex justify-end border-t border-white/4 px-4 py-1.5 font-mono text-[10px] text-zinc-700">
                    Levels {totalLevels} / 50 max
                </div>
            )}
        </div>
    )
}
