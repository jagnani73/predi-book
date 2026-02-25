import type { AggregatedLevel } from "@/lib/types"
import { BookRow } from "./BookRow"

type Props = {
    levels: AggregatedLevel[]
    side: "bid" | "ask"
    /** For asks: display in reversed order (cheapest at bottom, near spread) */
    reversed?: boolean
}

export function BookTable({ levels, side, reversed = false }: Props) {
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

    const rows = reversed ? [...filtered].reverse() : filtered

    return (
        <div className="flex flex-col gap-px">
            {rows.map((level) => (
                <BookRow
                    key={level.price}
                    level={level}
                    maxSize={maxSize}
                    side={side}
                />
            ))}
        </div>
    )
}
