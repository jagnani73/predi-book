"use client"

import type { AggregatedLevel } from "@/lib/types"
import { formatPrice } from "@/lib/format"

type Props = {
    bestBid: AggregatedLevel | undefined
    bestAsk: AggregatedLevel | undefined
}

export function SpreadBand({ bestBid, bestAsk }: Props) {
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

    return (
        <div className="z-20 flex items-center justify-center gap-3 border-y border-white/8 py-2 font-mono text-xs text-zinc-500">
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
    )
}
