"use client"

import { useState } from "react"
import type { AggregatedBook, AggregatedLevel, PriceLevel } from "@/lib/types"
import { BookTable } from "./BookTable"
import { SpreadBand } from "./SpreadBand"

type ViewMode = "combined" | "polymarket" | "kalshi"

type Props = {
    book: AggregatedBook | null
    isConnecting: boolean
}

function toAggregatedLevels(
    levels: PriceLevel[],
    venue: "polymarket" | "kalshi",
): AggregatedLevel[] {
    return levels.map((l) => ({ ...l, venue }))
}

function bestPrice(levels: PriceLevel[], dir: "bid" | "ask"): string | undefined {
    if (levels.length === 0) return undefined
    const sorted = [...levels].sort((a, b) =>
        dir === "bid"
            ? parseFloat(b.price) - parseFloat(a.price)
            : parseFloat(a.price) - parseFloat(b.price),
    )
    return sorted[0]?.price
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

const VIEW_MODES: ViewMode[] = ["combined", "polymarket", "kalshi"]
const VIEW_LABELS: Record<ViewMode, string> = {
    combined: "Combined",
    polymarket: "Polymarket",
    kalshi: "Kalshi",
}

export function OrderBookPanel({ book, isConnecting }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("combined")

    // Derive active bids/asks for the selected view
    const activeBids: AggregatedLevel[] =
        !book
            ? []
            : viewMode === "combined"
              ? book.bids
              : toAggregatedLevels(
                    viewMode === "polymarket" ? book.polymarket.bids : book.kalshi.bids,
                    viewMode,
                )

    const activeAsks: AggregatedLevel[] =
        !book
            ? []
            : viewMode === "combined"
              ? book.asks
              : toAggregatedLevels(
                    viewMode === "polymarket" ? book.polymarket.asks : book.kalshi.asks,
                    viewMode,
                )

    const bestBid = activeBids[0]
    const bestAsk = activeAsks[0]

    // Per-venue bests — always from raw venue books, regardless of view mode
    const polyBestBid = book ? bestPrice(book.polymarket.bids, "bid") : undefined
    const polyBestAsk = book ? bestPrice(book.polymarket.asks, "ask") : undefined
    const kalshiBestBid = book ? bestPrice(book.kalshi.bids, "bid") : undefined
    const kalshiBestAsk = book ? bestPrice(book.kalshi.asks, "ask") : undefined

    return (
        <div className="rounded-xl border border-white/8 bg-zinc-900">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Order Book
                </h2>
                <span className="rounded border border-white/8 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                    YES
                </span>
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
                    <BookTable levels={activeAsks} side="ask" reversed={true} />

                    <SpreadBand
                        bestBid={bestBid}
                        bestAsk={bestAsk}
                        polyBestBid={polyBestBid}
                        polyBestAsk={polyBestAsk}
                        kalshiBestBid={kalshiBestBid}
                        kalshiBestAsk={kalshiBestAsk}
                    />

                    {/* Bids — highest bid at top (near spread) */}
                    <BookTable levels={activeBids} side="bid" />
                </>
            )}
        </div>
    )
}
