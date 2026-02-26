"use client"

import { formatPrice, formatUsd } from "@/lib/format"
import type { QuoteState } from "@/hooks/useQuote"
import type { AggregatedBook } from "@/lib/types"
import { FillBreakdown } from "./FillBreakdown"

type Props = {
    quote: QuoteState
    isConnecting: boolean
    book: AggregatedBook | null
}

export function QuotePanel({ quote, isConnecting, book }: Props) {
    const { amount, setAmount, side, setSide, result, midPrice } = quote

    // Total depth for price impact bar
    const totalDepth =
        book && result
            ? (side === "YES" ? book.asks : book.bids).reduce(
                  (acc, l) => acc + parseFloat(l.size),
                  0,
              )
            : 0

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-white/8 bg-zinc-900 p-4 lg:sticky lg:top-[73px]">
            {/* Panel header */}
            <div className="border-b border-white/6 pb-3 -mx-4 px-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Quote Simulator
                </h2>
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="quote-amount"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-600"
                >
                    Amount
                </label>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-zinc-500">$</span>
                    <input
                        id="quote-amount"
                        type="number"
                        min="0"
                        step="10"
                        placeholder="0.00"
                        value={amount === 0 ? "" : amount}
                        onChange={(e) =>
                            setAmount(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                </div>
            </div>

            {/* YES / NO toggle */}
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Side
                </span>
                <div className="grid grid-cols-2 rounded-lg border border-zinc-700 p-0.5">
                    <button
                        onClick={() => setSide("YES")}
                        className={`rounded-md py-2 text-sm font-semibold transition-colors duration-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 outline-none ${
                            side === "YES"
                                ? "border border-green-500/30 bg-green-500/20 text-green-300"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        YES
                    </button>
                    <button
                        onClick={() => setSide("NO")}
                        className={`rounded-md py-2 text-sm font-semibold transition-colors duration-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 outline-none ${
                            side === "NO"
                                ? "border border-red-500/30 bg-red-500/20 text-red-300"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        NO
                    </button>
                </div>
            </div>

            {/* Result */}
            {result && amount > 0 ? (
                <div className="flex flex-col gap-4 border-t border-white/6 pt-4">
                    {/* Summary */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                                Shares
                            </span>
                            <span className="font-mono text-2xl font-bold text-white">
                                {result.totalShares.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-zinc-500">
                                avg price
                            </span>
                            <span className="font-mono text-sm text-zinc-400">
                                {formatPrice(result.avgPrice)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-zinc-500">
                                total cost
                            </span>
                            <span className="font-mono text-sm text-zinc-400">
                                {formatUsd(result.totalCost)}
                            </span>
                        </div>
                    </div>

                    <FillBreakdown
                        result={result}
                        midPrice={midPrice}
                        totalDepth={totalDepth}
                    />
                </div>
            ) : (
                <div className="flex h-24 flex-col items-center justify-center gap-1 border-t border-white/6 pt-4">
                    <span className="font-mono text-xs text-zinc-700">
                        {isConnecting
                            ? "Waiting for book data…"
                            : "Enter an amount to simulate"}
                    </span>
                </div>
            )}
        </div>
    )
}
