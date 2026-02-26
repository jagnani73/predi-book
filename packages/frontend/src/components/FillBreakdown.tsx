"use client"

import { useState } from "react"
import type { QuoteResult } from "@/lib/quote"
import { formatPrice, formatSize, formatUsd } from "@/lib/format"

type Props = {
    result: QuoteResult
    midPrice: number | null
    totalDepth: number
}

const VENUE_LABEL: Record<string, string> = {
    polymarket: "PM",
    kalshi: "KX",
    both: "BOTH",
}

export function FillBreakdown({ result, midPrice, totalDepth }: Props) {
    const [showFills, setShowFills] = useState(false)
    const { polymarket, kalshi } = result.venueSplit

    // Slippage: effective avg price vs mid
    const slippagePct =
        midPrice && midPrice > 0 && result.avgPrice > 0
            ? ((result.avgPrice - midPrice) / midPrice) * 100
            : null

    // Price impact: share of total depth consumed
    const fillDepth = result.fills.reduce((acc, f) => acc + f.shares, 0)
    const impactPct =
        totalDepth > 0 ? Math.min((fillDepth / totalDepth) * 100, 100) : 0

    return (
        <div className="flex flex-col gap-1.5">
            {/* Slippage preview */}
            {slippagePct !== null && (
                <div className="flex items-center justify-between rounded-md bg-zinc-800/40 px-3 py-2 font-mono text-xs">
                    <span className="text-zinc-500">Effective</span>
                    <span className="text-zinc-400">
                        {formatPrice(result.avgPrice)}
                    </span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-zinc-500">Mid</span>
                    <span className="text-zinc-400">{formatPrice(midPrice!)}</span>
                    <span className="text-zinc-700">·</span>
                    <span
                        className={
                            Math.abs(slippagePct) > 3
                                ? "text-red-400"
                                : Math.abs(slippagePct) > 1
                                  ? "text-yellow-400"
                                  : "text-zinc-500"
                        }
                    >
                        {slippagePct > 0 ? "+" : ""}
                        {slippagePct.toFixed(2)}% slip
                    </span>
                </div>
            )}

            {/* Price impact bar */}
            {totalDepth > 0 && (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-zinc-600">
                        <span>Price impact</span>
                        <span>{impactPct.toFixed(1)}% of book depth</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${
                                impactPct > 50
                                    ? "bg-red-400"
                                    : impactPct > 20
                                      ? "bg-yellow-400"
                                      : "bg-indigo-400"
                            }`}
                            style={{ width: `${impactPct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Venue split */}
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Venue Split
            </span>
            <div className="flex flex-col gap-1">
                {polymarket.cost > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-zinc-800/60 px-3 py-2">
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-400">
                            Polymarket
                        </span>
                        <div className="flex items-center gap-3 font-mono text-sm">
                            <span className="text-white">
                                {formatUsd(polymarket.cost)}
                            </span>
                            <span className="w-12 text-right text-zinc-500">
                                {polymarket.pct.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}
                {kalshi.cost > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-zinc-800/60 px-3 py-2">
                        <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-400">
                            Kalshi
                        </span>
                        <div className="flex items-center gap-3 font-mono text-sm">
                            <span className="text-white">
                                {formatUsd(kalshi.cost)}
                            </span>
                            <span className="w-12 text-right text-zinc-500">
                                {kalshi.pct.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Execution path — collapsible fills table */}
            {result.fills.length > 0 && (
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setShowFills((s) => !s)}
                        className="flex items-center gap-1 text-left text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
                    >
                        <span>{showFills ? "▾" : "▸"}</span>
                        <span>
                            {showFills ? "hide fills" : "show fills"} (
                            {result.fills.length})
                        </span>
                    </button>
                    {showFills && (
                        <div className="flex flex-col gap-px overflow-hidden rounded-md border border-white/6">
                            {result.fills.map((fill, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between bg-zinc-800/40 px-3 py-1.5 font-mono text-[11px]"
                                >
                                    <span className="text-zinc-400">
                                        {formatSize(fill.shares.toFixed(2))} @{" "}
                                        {formatPrice(fill.price)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-500">
                                            {formatUsd(fill.cost)}
                                        </span>
                                        <span
                                            className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
                                                fill.venue === "polymarket"
                                                    ? "bg-indigo-500/15 text-indigo-400"
                                                    : fill.venue === "kalshi"
                                                      ? "bg-violet-500/15 text-violet-400"
                                                      : "bg-zinc-700/60 text-zinc-300"
                                            }`}
                                        >
                                            {VENUE_LABEL[fill.venue]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!result.fullyFilled && (
                <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
                    <span className="text-yellow-500/80">
                        ⚠ Insufficient liquidity — partial fill only
                    </span>
                    <span className="text-zinc-500">
                        Max fillable{" "}
                        <span className="text-zinc-300">
                            {formatUsd(result.totalCost)}
                        </span>
                    </span>
                </div>
            )}
        </div>
    )
}
