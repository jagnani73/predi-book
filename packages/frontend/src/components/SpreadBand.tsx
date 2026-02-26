"use client"

import { useEffect, useRef, useState } from "react"
import type { AggregatedLevel } from "@/lib/types"
import { formatPrice, formatRelative } from "@/lib/format"

type Props = {
    bestBid: AggregatedLevel | undefined
    bestAsk: AggregatedLevel | undefined
    polyBestBid?: string
    polyBestAsk?: string
    kalshiBestBid?: string
    kalshiBestAsk?: string
    polyLastUpdated?: number
    kalshiLastUpdated?: number
    polyMessageCount?: number
    kalshiMessageCount?: number
    updatesPerSec?: number
    snapshotAt?: string | null
    liquidityAdvantage?: string | null
}

function useElapsed(tsMs: number): string {
    const [label, setLabel] = useState("—")
    useEffect(() => {
        if (!tsMs) {
            setLabel("—")
            return
        }
        const update = () => {
            const s = (Date.now() - tsMs) / 1000
            if (s < 2) setLabel("<1s ago")
            else if (s < 60) setLabel(`${Math.floor(s)}s ago`)
            else setLabel(`${Math.floor(s / 60)}m ago`)
        }
        update()
        const id = setInterval(update, 1000)
        return () => clearInterval(id)
    }, [tsMs])
    return label
}

function elapsedColor(tsMs: number): string {
    if (!tsMs) return "text-zinc-600"
    const s = (Date.now() - tsMs) / 1000
    if (s < 2) return "text-green-400"
    if (s < 5) return "text-yellow-400"
    return "text-red-400"
}

function fmtCount(n: number | undefined): string {
    if (!n) return "0"
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/** Track last N mid values with timestamps for drift calculation */
const MID_HISTORY_S = 120 // 2-minute window

export function SpreadBand({
    bestBid,
    bestAsk,
    polyBestBid,
    polyBestAsk,
    kalshiBestBid,
    kalshiBestAsk,
    polyLastUpdated = 0,
    kalshiLastUpdated = 0,
    polyMessageCount,
    kalshiMessageCount,
    updatesPerSec,
    snapshotAt,
    liquidityAdvantage,
}: Props) {
    const bidPrice = bestBid ? parseFloat(bestBid.price) : null
    const askPrice = bestAsk ? parseFloat(bestAsk.price) : null

    const spread =
        bidPrice !== null && askPrice !== null
            ? (askPrice - bidPrice).toFixed(4)
            : null

    const midVal =
        bidPrice !== null && askPrice !== null
            ? (bidPrice + askPrice) / 2
            : null

    const mid = midVal !== null ? formatPrice(midVal) : null

    const fmtPx = (p: string | undefined) =>
        p ? formatPrice(parseFloat(p)) : "—"

    // Which venue sets the overall best bid / best ask
    const pBid = polyBestBid ? parseFloat(polyBestBid) : -Infinity
    const kBid = kalshiBestBid ? parseFloat(kalshiBestBid) : -Infinity
    const pAsk = polyBestAsk ? parseFloat(polyBestAsk) : Infinity
    const kAsk = kalshiBestAsk ? parseFloat(kalshiBestAsk) : Infinity

    const bestBidVenue = pBid >= kBid ? "PM" : "KX"
    const bestAskVenue = pAsk <= kAsk ? "PM" : "KX"

    // Cross-venue improvement: aggregated best better than either venue alone
    const soloMaxBid = Math.max(pBid, kBid)
    const soloMinAsk = Math.min(pAsk, kAsk)
    const aggBidBetter =
        bidPrice !== null && isFinite(soloMaxBid) && bidPrice > soloMaxBid
    const aggAskBetter =
        askPrice !== null && isFinite(soloMinAsk) && askPrice < soloMinAsk
    const improvementDelta = aggBidBetter
        ? (bidPrice! - soloMaxBid).toFixed(4)
        : aggAskBetter
          ? (soloMinAsk - askPrice!).toFixed(4)
          : null
    const improvementSide = aggBidBetter ? "bid" : aggAskBetter ? "ask" : null

    // §R2-8 Drift indicator — track mid history and compute trend
    const midHistory = useRef<{ ts: number; mid: number }[]>([])
    const [drift, setDrift] = useState<{ dir: "↑" | "↓" | "→"; pct: number } | null>(null)

    useEffect(() => {
        if (midVal === null) return
        const now = Date.now()
        midHistory.current.push({ ts: now, mid: midVal })
        // Prune old entries
        const cutoff = now - MID_HISTORY_S * 1000
        midHistory.current = midHistory.current.filter((e) => e.ts > cutoff)
        // Need at least 10s of history to show drift
        if (midHistory.current.length < 2) return
        const oldest = midHistory.current[0]
        const elapsed = (now - oldest.ts) / 1000
        if (elapsed < 10) return
        const changePct = ((midVal - oldest.mid) / oldest.mid) * 100
        if (Math.abs(changePct) < 0.1) {
            setDrift({ dir: "→", pct: 0 })
        } else {
            setDrift({
                dir: changePct > 0 ? "↑" : "↓",
                pct: Math.abs(changePct),
            })
        }
    }, [midVal])

    const polyElapsed = useElapsed(polyLastUpdated)
    const kalshiElapsed = useElapsed(kalshiLastUpdated)

    return (
        <div className="z-20 border-y border-white/8 py-2 font-mono text-xs text-zinc-500">
            {/* Spread + mid + implied probability + tick */}
            <div className="flex flex-wrap items-center justify-center gap-3 px-4">
                {spread !== null ? (
                    <>
                        <span>
                            SPREAD{" "}
                            <span className="text-zinc-400">{spread}</span>
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span>
                            MID <span className="text-zinc-300">{mid}</span>
                            {midVal !== null && (
                                <span className="ml-1 text-zinc-500">
                                    ({(midVal * 100).toFixed(1)}%)
                                </span>
                            )}
                            {drift && drift.dir !== "→" && (
                                <span
                                    className={`ml-1.5 text-[10px] ${drift.dir === "↑" ? "text-green-400" : "text-red-400"}`}
                                >
                                    {drift.dir} {drift.pct.toFixed(2)}%
                                </span>
                            )}
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-zinc-700">TICK 0.01</span>
                    </>
                ) : (
                    <span>—</span>
                )}
            </div>

            {/* §R2-2 Explicit venue best comparison panel — always rendered for stable height */}
            <div className="mt-1.5 grid grid-cols-3 gap-0 border-t border-white/4 px-4 pt-1.5 text-[10px]">
                {/* Header row */}
                <span className="text-zinc-700" />
                <span className="text-center text-zinc-700">Best Bid</span>
                <span className="text-center text-zinc-700">Best Ask</span>

                {/* Polymarket row */}
                <span className="text-indigo-500/70">PM</span>
                <span
                    className={`text-center ${bestBidVenue === "PM" ? "text-green-300" : "text-zinc-500"}`}
                >
                    {fmtPx(polyBestBid)}
                    {bestBidVenue === "PM" && (
                        <span className="ml-0.5 text-green-400/60">★</span>
                    )}
                </span>
                <span
                    className={`text-center ${bestAskVenue === "PM" ? "text-red-300" : "text-zinc-500"}`}
                >
                    {fmtPx(polyBestAsk)}
                    {bestAskVenue === "PM" && (
                        <span className="ml-0.5 text-red-400/60">★</span>
                    )}
                </span>

                {/* Kalshi row */}
                <span className="text-violet-500/70">KX</span>
                <span
                    className={`text-center ${bestBidVenue === "KX" ? "text-green-300" : "text-zinc-500"}`}
                >
                    {fmtPx(kalshiBestBid)}
                    {bestBidVenue === "KX" && (
                        <span className="ml-0.5 text-green-400/60">★</span>
                    )}
                </span>
                <span
                    className={`text-center ${bestAskVenue === "KX" ? "text-red-300" : "text-zinc-500"}`}
                >
                    {fmtPx(kalshiBestAsk)}
                    {bestAskVenue === "KX" && (
                        <span className="ml-0.5 text-red-400/60">★</span>
                    )}
                </span>

                {/* Combined row */}
                <span className="text-zinc-600">Combined</span>
                <span className="text-center text-green-400/80">
                    {bestBid ? formatPrice(bestBid.price) : "—"}
                </span>
                <span className="text-center text-red-400/80">
                    {bestAsk ? formatPrice(bestAsk.price) : "—"}
                </span>
            </div>

            {/* Cross-venue improvement + liquidity chips — fixed height container prevents layout shift */}
            <div className="mt-1 flex min-h-[20px] flex-col items-center gap-1">
                {improvementDelta && (
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
                        ↑ {improvementDelta} improvement on {improvementSide} via aggregation
                    </span>
                )}
                {liquidityAdvantage && (
                    <span className="rounded bg-indigo-500/8 px-1.5 py-0.5 text-[10px] text-indigo-400/80">
                        {liquidityAdvantage}
                    </span>
                )}
            </div>

            {/* Per-venue freshness + counts */}
            <div className="mt-1.5 flex justify-between border-t border-white/4 px-4 pt-1.5 text-[10px]">
                <span className="flex items-center gap-1.5">
                    <span className="text-indigo-500/70">PM</span>
                    <span className={elapsedColor(polyLastUpdated)}>
                        {polyElapsed}
                    </span>
                    <span className="text-zinc-700">
                        {fmtCount(polyMessageCount)} upd
                    </span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="text-zinc-700">
                        {fmtCount(kalshiMessageCount)} upd
                    </span>
                    <span className={elapsedColor(kalshiLastUpdated)}>
                        {kalshiElapsed}
                    </span>
                    <span className="text-violet-500/70">KX</span>
                </span>
            </div>

            {/* Update rate + snapshot */}
            <div className="mt-1 flex justify-between px-4 text-[10px] text-zinc-700">
                <span>
                    {updatesPerSec !== undefined
                        ? `${updatesPerSec.toFixed(1)} upd/s`
                        : ""}
                </span>
                <span>
                    {snapshotAt ? `snapshot ${formatRelative(snapshotAt)}` : ""}
                </span>
            </div>
        </div>
    )
}
