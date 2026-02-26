"use client"

import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from "recharts"
import type { AggregatedLevel } from "@/lib/types"
import { formatPrice, formatSize } from "@/lib/format"

type Props = {
    bids: AggregatedLevel[]
    asks: AggregatedLevel[]
}

type DataPoint = {
    price: number
    bidDepth?: number
    askDepth?: number
}

function buildCurve(bids: AggregatedLevel[], asks: AggregatedLevel[]): DataPoint[] {
    // Bids: sorted descending (best bid first), cumulate from best outward
    const sortedBids = [...bids]
        .filter((l) => parseFloat(l.size) > 0)
        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))

    // Asks: sorted ascending (best ask first), cumulate from best outward
    const sortedAsks = [...asks]
        .filter((l) => parseFloat(l.size) > 0)
        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))

    const bidPoints: DataPoint[] = []
    let cumBid = 0
    for (const l of sortedBids) {
        cumBid += parseFloat(l.size)
        bidPoints.push({ price: parseFloat(l.price), bidDepth: cumBid })
    }
    // Sort bid points ascending for the chart (lowest price left)
    bidPoints.sort((a, b) => a.price - b.price)

    const askPoints: DataPoint[] = []
    let cumAsk = 0
    for (const l of sortedAsks) {
        cumAsk += parseFloat(l.size)
        askPoints.push({ price: parseFloat(l.price), askDepth: cumAsk })
    }

    // Merge into single array sorted by price
    const priceMap = new Map<number, DataPoint>()
    for (const p of bidPoints) priceMap.set(p.price, { ...p })
    for (const p of askPoints) {
        const existing = priceMap.get(p.price)
        if (existing) existing.askDepth = p.askDepth
        else priceMap.set(p.price, { ...p })
    }

    return Array.from(priceMap.values()).sort((a, b) => a.price - b.price)
}

export function DepthChart({ bids, asks }: Props) {
    const data = buildCurve(bids, asks)
    if (data.length === 0) return null

    return (
        <div className="border-t border-white/6 px-3 py-2">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-700">
                Depth
            </span>
            <ResponsiveContainer width="100%" height={80}>
                <AreaChart
                    data={data}
                    margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
                >
                    <defs>
                        <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="price"
                        tickFormatter={(v: number) => formatPrice(v)}
                        tick={{ fill: "#52525b", fontSize: 9, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <Tooltip
                        contentStyle={{
                            background: "#18181b",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 6,
                            fontSize: 11,
                            fontFamily: "monospace",
                            color: "#a1a1aa",
                        }}
                        formatter={(value: number, name: string) => [
                            formatSize(String(value.toFixed(0))),
                            name === "bidDepth" ? "Cum Bid" : "Cum Ask",
                        ]}
                        labelFormatter={(v: number) => `Price ${formatPrice(v)}`}
                    />
                    <Area
                        type="stepAfter"
                        dataKey="bidDepth"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                        fill="url(#bidGrad)"
                        connectNulls={false}
                        dot={false}
                        isAnimationActive={false}
                    />
                    <Area
                        type="stepBefore"
                        dataKey="askDepth"
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        fill="url(#askGrad)"
                        connectNulls={false}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
