import type { AggregatedLevel, VenueBook } from "@/lib/types"
import { BookRow } from "./BookRow"

type Props = {
    levels: AggregatedLevel[]
    side: "bid" | "ask"
    /** For asks: display in reversed order (cheapest at bottom, near spread) */
    reversed?: boolean
    /** Raw venue books — used to compute per-venue split for "both" levels */
    venueBooks?: { polymarket: VenueBook; kalshi: VenueBook }
}

function lookupVenueSize(
    price: string,
    book: VenueBook,
    side: "bid" | "ask",
): number {
    const levels = side === "bid" ? book.bids : book.asks
    const match = levels.find((l) => l.price === price)
    return match ? parseFloat(match.size) : 0
}

export function BookTable({
    levels,
    side,
    reversed = false,
    venueBooks,
}: Props) {
    const filtered = levels.filter((l) => parseFloat(l.size) > 0)
    const maxSize = Math.max(...filtered.map((l) => parseFloat(l.size)), 0)

    if (filtered.length === 0) {
        return (
            <div className="flex h-24 items-center justify-center">
                <span className="font-mono text-xs text-zinc-700">
                    No {side === "bid" ? "bids" : "asks"}
                </span>
            </div>
        )
    }

    // Precompute cumulative sizes (top-of-book first)
    let running = 0
    const cumulativeSizes: number[] = filtered.map((l) => {
        running += parseFloat(l.size)
        return running
    })

    const rows = reversed ? [...filtered].reverse() : filtered
    const cumRows = reversed ? [...cumulativeSizes].reverse() : cumulativeSizes

    return (
        <div className="flex flex-col gap-px">
            {rows.map((level, i) => {
                let venueSplit:
                    | { pm: number; kx: number }
                    | undefined = undefined
                if (level.venue === "both" && venueBooks) {
                    const pm = lookupVenueSize(level.price, venueBooks.polymarket, side)
                    const kx = lookupVenueSize(level.price, venueBooks.kalshi, side)
                    const total = pm + kx
                    if (total > 0) {
                        venueSplit = {
                            pm: Math.round((pm / total) * 100),
                            kx: Math.round((kx / total) * 100),
                        }
                    }
                }

                return (
                    <BookRow
                        key={level.price}
                        level={level}
                        maxSize={maxSize}
                        side={side}
                        cumulativeSize={cumRows[i]}
                        venueSplit={venueSplit}
                    />
                )
            })}
        </div>
    )
}
