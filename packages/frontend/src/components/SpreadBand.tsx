"use client"

import type { AggregatedLevel } from "@/lib/types"
import { formatPrice } from "@/lib/format"

type Props = {
    bestBid: AggregatedLevel | undefined
    bestAsk: AggregatedLevel | undefined
    polyBestBid?: string
    polyBestAsk?: string
    kalshiBestBid?: string
    kalshiBestAsk?: string
}

export function SpreadBand({
    bestBid,
    bestAsk,
    polyBestBid,
    polyBestAsk,
    kalshiBestBid,
    kalshiBestAsk,
}: Props) {
    const bidPrice = bestBid ? parseFloat(bestBid.price) : null
    const askPrice = bestAsk ? parseFloat(bestAsk.price) : null

    const spread =
        bidPrice !== null && askPrice !== null
            ? (askPrice - bidPrice).toFixed(4)
            : null

    const mid =
        bidPrice !== null && askPrice !== null
            ? formatPrice((bidPrice + askPrice) / 2)
            : null

    const fmtPx = (p: string | undefined) =>
        p ? formatPrice(parseFloat(p)) : "—"

    return (
        <div className="z-20 border-y border-white/8 py-2 font-mono text-xs text-zinc-500">
            {/* Spread + mid */}
            <div className="flex items-center justify-center gap-3">
                {spread !== null ? (
                    <>
                        <span>
                            SPREAD{" "}
                            <span className="text-zinc-400">{spread}</span>
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span>
                            MID <span className="text-zinc-400">{mid}</span>
                        </span>
                    </>
                ) : (
                    <span>—</span>
                )}
            </div>

            {/* Per-venue best bid/ask */}
            <div className="mt-1.5 flex justify-between px-4 text-[10px] text-zinc-700">
                <span>
                    <span className="text-indigo-500/70">PM</span>{" "}
                    {fmtPx(polyBestBid)} / {fmtPx(polyBestAsk)}
                </span>
                <span>
                    <span className="text-violet-500/70">KX</span>{" "}
                    {fmtPx(kalshiBestBid)} / {fmtPx(kalshiBestAsk)}
                </span>
            </div>
        </div>
    )
}
