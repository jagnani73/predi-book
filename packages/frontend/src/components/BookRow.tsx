"use client"

import React, { useEffect, useRef } from "react"
import type { AggregatedLevel } from "@/lib/types"
import { formatPrice, formatSize } from "@/lib/format"

type Props = {
    level: AggregatedLevel
    maxSize: number
    side: "bid" | "ask"
}

const VENUE_STYLES = {
    polymarket: "bg-indigo-500/15 text-indigo-400",
    kalshi: "bg-violet-500/15 text-violet-400",
    both: "bg-violet-400/15 text-violet-300",
}

const VENUE_LABELS = {
    polymarket: "PM",
    kalshi: "KX",
    both: "BOTH",
}

function BookRowComponent({ level, maxSize, side }: Props) {
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
            void el.offsetWidth // force reflow to restart animation
            el.classList.add("price-flash")
        }
        prevSize.current = size
    }, [size])

    return (
        <div
            ref={rowRef}
            className="relative flex cursor-default items-center gap-2 px-3 py-[5px] transition-colors duration-100 hover:bg-white/[0.03]"
            aria-label={`${isBid ? "Bid" : "Ask"} ${formatPrice(price)} size ${formatSize(size)}`}
        >
            {/* Depth bar */}
            <div
                className={`absolute inset-y-0 ${isBid ? "right-0" : "left-0"} z-0 pointer-events-none`}
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

            {/* Venue tag */}
            <span
                className={`z-10 rounded px-1.5 py-0.5 text-[11px] font-semibold ${VENUE_STYLES[venue]}`}
            >
                {VENUE_LABELS[venue]}
            </span>
        </div>
    )
}

export const BookRow = React.memo(BookRowComponent)
export default BookRow
