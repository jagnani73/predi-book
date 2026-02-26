"use client";

import { FillBreakdown } from "./FillBreakdown";
import type { QuoteState } from "@/hooks/useQuote";
import { formatPrice, formatUsd } from "@/lib/format";
import type { QuoteResult } from "@/lib/quote";
import type { AggregatedBook, AggregatedLevel } from "@/lib/types";
import { useRef, useState } from "react";

type Props = {
    quote: QuoteState;
    isConnecting: boolean;
    book: AggregatedBook | null;
};

export function QuotePanel({ quote, isConnecting, book }: Props) {
    const { amount, setAmount, side, setSide, result, midPrice } = quote;

    const [paused, setPaused] = useState(false);
    const frozenResult = useRef<QuoteResult | null>(null);
    const frozenMidPrice = useRef<number | null>(null);
    const frozenTotalDepth = useRef<number>(0);
    const frozenSide = useRef<"YES" | "NO">("YES");

    // Total depth for price impact bar
    const liveTotalDepth =
        book && result
            ? (side === "YES" ? book.asks : book.bids).reduce(
                  (acc: number, l: AggregatedLevel) => acc + parseFloat(l.size),
                  0,
              )
            : 0;

    if (!paused) {
        frozenResult.current = result;
        frozenMidPrice.current = midPrice;
        frozenTotalDepth.current = liveTotalDepth;
        frozenSide.current = side;
    }

    const displayResult = paused ? frozenResult.current : result;
    const displayMidPrice = paused ? frozenMidPrice.current : midPrice;
    const displayTotalDepth = paused
        ? frozenTotalDepth.current
        : liveTotalDepth;

    return (
        <div
            className="flex flex-col gap-4 rounded-xl border border-white/8 bg-zinc-900 p-4 lg:sticky lg:top-[73px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Panel header */}
            <div className="-mx-4 flex items-center gap-2 border-b border-white/6 px-4 pb-3">
                <h2 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                    Quote Simulator
                </h2>
                {paused && (
                    <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-zinc-400">
                        PAUSED
                    </span>
                )}
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="quote-amount"
                    className="text-xs font-semibold tracking-wider text-zinc-600 uppercase"
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
                            setAmount(
                                Math.max(0, parseFloat(e.target.value) || 0),
                            )
                        }
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white transition-colors outline-none placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                </div>
            </div>

            {/* YES / NO toggle */}
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-wider text-zinc-600 uppercase">
                    Side
                </span>
                <div className="grid grid-cols-2 rounded-lg border border-zinc-700 p-0.5">
                    <button
                        onClick={() => setSide("YES")}
                        className={`cursor-pointer rounded-md py-2 text-sm font-semibold transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                            side === "YES"
                                ? "border border-green-500/30 bg-green-500/20 text-green-300"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        YES
                    </button>
                    <button
                        onClick={() => setSide("NO")}
                        className={`cursor-pointer rounded-md py-2 text-sm font-semibold transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                            side === "NO"
                                ? "border border-red-500/30 bg-red-500/20 text-red-300"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        NO
                    </button>
                </div>
            </div>

            {/* Result — hover to pause so fills can be read while book updates */}
            {displayResult && amount > 0 ? (
                <div className="flex flex-col gap-4 border-t border-white/6 pt-4">
                    {/* Summary */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold tracking-wider text-zinc-600 uppercase">
                                Shares
                            </span>
                            <span className="font-mono text-2xl font-bold text-white">
                                {displayResult.totalShares.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-zinc-500">
                                avg price
                            </span>
                            <span className="font-mono text-sm text-zinc-400">
                                {formatPrice(displayResult.avgPrice)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-zinc-500">
                                total cost
                            </span>
                            <span className="font-mono text-sm text-zinc-400">
                                {formatUsd(displayResult.totalCost)}
                            </span>
                        </div>
                    </div>

                    <FillBreakdown
                        result={displayResult}
                        midPrice={displayMidPrice}
                        totalDepth={displayTotalDepth}
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
    );
}
