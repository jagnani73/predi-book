import type { QuoteResult } from "@/lib/quote"
import { formatUsd } from "@/lib/format"

type Props = {
    result: QuoteResult
}

export function FillBreakdown({ result }: Props) {
    const { polymarket, kalshi } = result.venueSplit

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Venue Split
            </span>
            <div className="flex flex-col gap-1">
                {polymarket.cost > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-zinc-800/60 px-3 py-2">
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-400">
                            Polymarket
                        </span>
                        <div className="flex items-center gap-3 font-mono text-sm">
                            <span className="text-white">
                                {formatUsd(polymarket.cost)}
                            </span>
                            <span className="w-12 text-right text-zinc-500">
                                {polymarket.pct.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}
                {kalshi.cost > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-zinc-800/60 px-3 py-2">
                        <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-400">
                            Kalshi
                        </span>
                        <div className="flex items-center gap-3 font-mono text-sm">
                            <span className="text-white">
                                {formatUsd(kalshi.cost)}
                            </span>
                            <span className="w-12 text-right text-zinc-500">
                                {kalshi.pct.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {!result.fullyFilled && (
                <p className="mt-1 font-mono text-[11px] text-yellow-500/80">
                    ⚠ Book too thin — partial fill only
                </p>
            )}
        </div>
    )
}
