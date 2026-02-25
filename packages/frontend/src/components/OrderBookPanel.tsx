import type { AggregatedBook } from "@/lib/types"
import { BookTable } from "./BookTable"
import { SpreadBand } from "./SpreadBand"

type Props = {
    book: AggregatedBook | null
    isConnecting: boolean
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

export function OrderBookPanel({ book, isConnecting }: Props) {
    const asks = book?.asks ?? []
    const bids = book?.bids ?? []
    const bestAsk = asks[0] // asks sorted ascending: index 0 = cheapest
    const bestBid = bids[0] // bids sorted descending: index 0 = highest

    return (
        <div className="rounded-xl border border-white/8 bg-zinc-900">
            {/* Panel header */}
            <div className="border-b border-white/6 px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Order Book
                </h2>
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
                    <BookTable
                        levels={asks}
                        side="ask"
                        reversed={true}
                    />

                    <SpreadBand bestBid={bestBid} bestAsk={bestAsk} />

                    {/* Bids — highest bid at top (near spread) */}
                    <BookTable levels={bids} side="bid" />
                </>
            )}
        </div>
    )
}
