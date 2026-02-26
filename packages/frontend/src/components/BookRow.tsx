"use client"

import React, { useEffect, useRef } from "react"
import type { AggregatedLevel } from "@/lib/types"
import { formatPrice, formatSize } from "@/lib/format"

type Props = {
    level: AggregatedLevel
    maxSize: number
    side: "bid" | "ask"
    cumulativeSize?: number
    venueSplit?: { pm: number; kx: number }
}

const VENUE_STYLES = {
    polymarket: "bg-indigo-500/15 text-indigo-400",
    kalshi: "bg-violet-500/15 text-violet-400",
    both: "bg-zinc-700/60 text-zinc-300",
}

function BookRowComponent({
    level,
    maxSize,
    side,
    cumulativeSize,
    venueSplit,
}: Props) {
    const { price, size, venue } = level
    const sizeNum = parseFloat(size)
    const barWidth = maxSize > 0 ? (sizeNum / maxSize) * 100 : 0
    const isBid = side === "bid"

    const prevSize = useRef(size)
    const rowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (prevSize.current !== size && rowRef.current) {
            const el = rowRef.current
            el.classList.remove("price-flash")
            void el.offsetWidth
            el.classList.add("price-flash")
        }
        prevSize.current = size
    }, [size])

    const cumTitle = cumulativeSize
        ? `Cumulative: ${formatSize(String(cumulativeSize))}`
        : undefined

    return (
        <div
            ref={rowRef}
            className="relative flex cursor-default items-center gap-2 px-3 py-[5px] transition-colors duration-100 hover:bg-white/3"
            aria-label={`${isBid ? "Bid" : "Ask"} ${formatPrice(price)} size ${formatSize(size)}`}
            title={cumTitle}
        >
            {/* Depth bar */}
            <div
                className={`absolute inset-y-0 ${isBid ? "right-0" : "left-0"} pointer-events-none z-0`}
                style={{
                    width: `${barWidth}%`,
                    backgroundColor: isBid
                        ? "rgba(34,197,94,0.08)"
                        : "rgba(239,68,68,0.08)",
                }}
            />

            {/* Price */}
            <span
                className={`z-10 w-14 font-mono text-sm font-medium ${isBid ? "text-green-400" : "text-red-400"}`}
            >
                {formatPrice(price)}
            </span>

            {/* Size */}
            <span
                className="z-10 flex-1 text-right font-mono text-sm text-zinc-300"
                aria-live="polite"
            >
                {formatSize(size)}
            </span>

            {/* Venue tag — split % for "both" levels, plain badge otherwise */}
            {venue === "both" && venueSplit ? (
                <span className="z-10 flex items-center gap-0.5 font-mono text-[10px]">
                    <span className="rounded bg-indigo-500/15 px-1 py-0.5 text-indigo-400">
                        PM {venueSplit.pm}%
                    </span>
                    <span className="rounded bg-violet-500/15 px-1 py-0.5 text-violet-400">
                        KX {venueSplit.kx}%
                    </span>
                </span>
            ) : (
                <span
                    className={`z-10 w-10 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold ${VENUE_STYLES[venue]}`}
                >
                    {venue === "polymarket" ? "PM" : venue === "kalshi" ? "KX" : "BOTH"}
                </span>
            )}
        </div>
    )
}

export const BookRow = React.memo(BookRowComponent)
export default BookRow
