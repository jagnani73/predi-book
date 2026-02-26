"use client"

import { useState } from "react"
import type { AggregatedBook } from "@/lib/types"
import type { VenueStatus } from "@/hooks/useOrderbook"

type Props = {
    book: AggregatedBook | null
    polyStatus: VenueStatus
    kalshiStatus: VenueStatus
    polyLastUpdated: number
    kalshiLastUpdated: number
    polyMessageCount: number
    kalshiMessageCount: number
}

type Section = "poly" | "kalshi" | "combined" | "stats"

function CollapsibleSection({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border border-white/6 rounded-md overflow-hidden">
            <button
                onClick={() => setOpen((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:bg-white/3 transition-colors"
            >
                <span>{title}</span>
                <span>{open ? "▾" : "▸"}</span>
            </button>
            {open && <div className="border-t border-white/6">{children}</div>}
        </div>
    )
}

function JsonBlock({ data }: { data: unknown }) {
    return (
        <pre className="overflow-auto p-3 font-mono text-[10px] text-zinc-400 max-h-48 leading-relaxed">
            {JSON.stringify(data, null, 2)}
        </pre>
    )
}

function elapsed(tsMs: number): string {
    if (!tsMs) return "never"
    const s = (Date.now() - tsMs) / 1000
    return s < 60 ? `${s.toFixed(1)}s ago` : `${Math.floor(s / 60)}m ago`
}

export function DebugPanel({
    book,
    polyStatus,
    kalshiStatus,
    polyLastUpdated,
    kalshiLastUpdated,
    polyMessageCount,
    kalshiMessageCount,
}: Props) {
    return (
        <div className="rounded-xl border border-white/8 bg-zinc-900 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Dev Mode
            </h2>
            <div className="flex flex-col gap-2">
                <CollapsibleSection title="Stats">
                    <div className="grid grid-cols-2 gap-px p-3 font-mono text-[11px] text-zinc-400">
                        <span className="text-zinc-600">PM status</span>
                        <span>{polyStatus}</span>
                        <span className="text-zinc-600">KX status</span>
                        <span>{kalshiStatus}</span>
                        <span className="text-zinc-600">PM last update</span>
                        <span>{elapsed(polyLastUpdated)}</span>
                        <span className="text-zinc-600">KX last update</span>
                        <span>{elapsed(kalshiLastUpdated)}</span>
                        <span className="text-zinc-600">PM messages</span>
                        <span>{polyMessageCount.toLocaleString()}</span>
                        <span className="text-zinc-600">KX messages</span>
                        <span>{kalshiMessageCount.toLocaleString()}</span>
                        <span className="text-zinc-600">Levels (bid/ask)</span>
                        <span>
                            {book?.bids.length ?? 0} / {book?.asks.length ?? 0}
                        </span>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Raw Polymarket Book">
                    <JsonBlock data={book?.polymarket ?? null} />
                </CollapsibleSection>

                <CollapsibleSection title="Raw Kalshi Book">
                    <JsonBlock data={book?.kalshi ?? null} />
                </CollapsibleSection>

                <CollapsibleSection title="Normalised Combined Book">
                    <JsonBlock
                        data={
                            book
                                ? {
                                      bids: book.bids,
                                      asks: book.asks,
                                      updatedAt: book.updatedAt,
                                      snapshotAt: book.snapshotAt,
                                  }
                                : null
                        }
                    />
                </CollapsibleSection>
            </div>
        </div>
    )
}
