"use client"

import { useEffect, useState } from "react"
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
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-zinc-700">TICK 0.01</span>
                    </>
                ) : (
                    <span>—</span>
                )}
            </div>

            {/* Best bid/ask attribution */}
            {(bestBid || bestAsk) && (
                <div className="mt-1.5 flex justify-between px-4 text-[10px]">
                    <span className="text-zinc-600">
                        Best Bid{" "}
                        <span className="text-green-400/70">
                            {bestBid ? formatPrice(bestBid.price) : "—"}
                        </span>{" "}
                        <span className="text-zinc-700">({bestBidVenue})</span>
                    </span>
                    <span className="text-zinc-600">
                        Best Ask{" "}
                        <span className="text-red-400/70">
                            {bestAsk ? formatPrice(bestAsk.price) : "—"}
                        </span>{" "}
                        <span className="text-zinc-700">({bestAskVenue})</span>
                    </span>
                </div>
            )}

            {/* Cross-venue improvement chip */}
            {improvementDelta && (
                <div className="mt-1 flex justify-center">
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
                        ↑ {improvementDelta} improvement via aggregation
                    </span>
                </div>
            )}

            {/* Per-venue freshness + counts */}
            <div className="mt-1.5 flex justify-between px-4 text-[10px]">
                <span className="flex items-center gap-1.5">
                    <span className="text-indigo-500/70">PM</span>
                    <span className={elapsedColor(polyLastUpdated)}>
                        {polyElapsed}
                    </span>
                    <span className="text-zinc-700">
                        {fmtPx(polyBestBid)} / {fmtPx(polyBestAsk)}
                    </span>
                    <span className="text-zinc-700">
                        {fmtCount(polyMessageCount)} upd
                    </span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="text-zinc-700">
                        {fmtCount(kalshiMessageCount)} upd
                    </span>
                    <span className="text-zinc-700">
                        {fmtPx(kalshiBestBid)} / {fmtPx(kalshiBestAsk)}
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
