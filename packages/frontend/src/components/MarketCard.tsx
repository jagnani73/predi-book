import type { MarketConfig } from "@/config/markets";
import Link from "next/link";

type Props = {
    market: MarketConfig;
};

export function MarketCard({ market }: Props) {
    const href = `/market/${market.conditionId}?k=${encodeURIComponent(market.kalshiTicker)}&label=${encodeURIComponent(market.label)}`;

    return (
        <Link
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-white/8 bg-zinc-900 p-4 transition-colors duration-150 hover:border-white/14 hover:bg-zinc-800/60"
        >
            <p className="text-sm leading-snug font-medium text-white group-hover:text-white">
                {market.label}
            </p>

            {/* Venue chips */}
            <div className="flex items-center gap-1.5">
                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-400">
                    Polymarket
                </span>
                <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-400">
                    Kalshi
                </span>
            </div>
        </Link>
    );
}
